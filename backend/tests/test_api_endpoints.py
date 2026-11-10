import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import connect_to_db, close_db_connection

@pytest.fixture(autouse=True)
async def setup_db():
    await connect_to_db()
    yield
    await close_db_connection()

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["models_loaded"] is True

@pytest.mark.asyncio
async def test_auth_and_isolation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        u1_email = f"user1_{uuid.uuid4().hex[:6]}@example.com"
        u2_email = f"user2_{uuid.uuid4().hex[:6]}@example.com"
        pwd = "SecurePassword123"

        # 1. Register User 1
        r1 = await ac.post("/api/auth/register", json={
            "name": "User One",
            "email": u1_email,
            "password": pwd,
            "confirm_password": pwd
        })
        assert r1.status_code == 201
        u1_data = r1.json()["user"]
        u1_cookies = r1.cookies

        # 2. Check /api/auth/me for User 1
        r_me = await ac.get("/api/auth/me", cookies=u1_cookies)
        assert r_me.status_code == 200
        assert r_me.json()["user"]["email"] == u1_email

        # 3. Register User 2
        r2 = await ac.post("/api/auth/register", json={
            "name": "User Two",
            "email": u2_email,
            "password": pwd,
            "confirm_password": pwd
        })
        assert r2.status_code == 201
        u2_cookies = r2.cookies

        # 4. Start monitoring session for User 1
        r_s1 = await ac.post("/api/monitoring/start", json={
            "source": "browser_camera",
            "eeg_source": "simulated_csv"
        }, cookies=u1_cookies)
        assert r_s1.status_code == 201
        s1_id = r_s1.json()["session"]["id"]

        # 5. User 2 tries to access User 1's session -> MUST BE 404
        r_iso = await ac.get(f"/api/sessions/{s1_id}", cookies=u2_cookies)
        assert r_iso.status_code == 404

        # 6. Stop session for User 1
        r_stop = await ac.post("/api/monitoring/stop", json={"session_id": s1_id}, cookies=u1_cookies)
        assert r_stop.status_code == 200
        assert r_stop.json()["session"]["status"] == "completed"

        # 7. Check session history for User 1 vs User 2
        r_h1 = await ac.get("/api/sessions", cookies=u1_cookies)
        assert r_h1.status_code == 200
        assert len(r_h1.json()["items"]) >= 1

        r_h2 = await ac.get("/api/sessions", cookies=u2_cookies)
        assert r_h2.status_code == 200
        assert len(r_h2.json()["items"]) == 0

@pytest.mark.asyncio
async def test_moments_capture():
    from app.services.session_registry import session_registry
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        email = f"moment_user_{uuid.uuid4().hex[:6]}@example.com"
        pwd = "SecurePassword123"

        r_reg = await ac.post("/api/auth/register", json={
            "name": "Moment User",
            "email": email,
            "password": pwd,
            "confirm_password": pwd
        })
        cookies = r_reg.cookies

        # Start session
        r_start = await ac.post("/api/monitoring/start", json={
            "source": "browser_camera",
            "eeg_source": "simulated_csv"
        }, cookies=cookies)
        session_id = r_start.json()["session"]["id"]

        # Seed in-memory telemetry in registry
        reg_state = session_registry.get(session_id)
        assert reg_state is not None
        reg_state.latest_telemetry = {
            "timestamp": "2026-11-09T16:20:00.000Z",
            "vision_score": 0.82,
            "eeg_score": 0.65,
            "fused_state": "True Meditative Stillness",
            "fused_code": "both_high",
            "discrepancy_alert": False,
            "eeg_source": "simulated_csv",
            "metrics": {
                "gaze_stability": 0.02,
                "head_stability": 0.01,
                "rolling_blinks": 3,
                "ear": 0.28,
                "alpha_theta_ratio": 0.35,
                "beta_power": 1.2e-12
            }
        }

        # Capture moment
        idem_key = str(uuid.uuid4())
        r_mom = await ac.post(
            "/api/moments",
            json={"session_id": session_id, "note": "Testing moment capture"},
            headers={"Idempotency-Key": idem_key},
            cookies=cookies
        )
        assert r_mom.status_code == 201
        m_id = r_mom.json()["moment"]["id"]
        assert r_mom.json()["moment"]["fused_code"] == "both_high"

        # Duplicate with same idempotency key -> returns 200 with same moment
        r_dup = await ac.post(
            "/api/moments",
            json={"session_id": session_id, "note": "Duplicate"},
            headers={"Idempotency-Key": idem_key},
            cookies=cookies
        )
        assert r_dup.status_code == 200
        assert r_dup.json()["moment"]["id"] == m_id

        # List moments
        r_list = await ac.get("/api/moments", cookies=cookies)
        assert r_list.status_code == 200
        assert r_list.json()["total"] == 1
        assert r_list.json()["items"][0]["id"] == m_id

        # Delete moment
        r_del = await ac.delete(f"/api/moments/{m_id}", cookies=cookies)
        assert r_del.status_code == 204

        # List moments after delete
        r_list2 = await ac.get("/api/moments", cookies=cookies)
        assert r_list2.status_code == 200
        assert r_list2.json()["total"] == 0
