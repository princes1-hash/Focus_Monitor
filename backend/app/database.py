import logging
import certifi
from pymongo import AsyncMongoClient
from app.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncMongoClient = None
    db = None

db_instance = Database()

async def connect_to_db():
    try:
        client_kwargs = {
            "serverSelectionTimeoutMS": 10000,
        }
        if "mongodb+srv" in settings.MONGODB_URI or "tls" in settings.MONGODB_URI.lower() or "ssl" in settings.MONGODB_URI.lower():
            client_kwargs["tlsCAFile"] = certifi.where()

        db_instance.client = AsyncMongoClient(
            settings.MONGODB_URI,
            **client_kwargs
        )
        db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
        # Ping the server
        await db_instance.client.admin.command('ping')
        logger.info(f"Connected to MongoDB database: {settings.MONGODB_DB_NAME}")
        await create_indexes()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        if settings.ENVIRONMENT == "production":
            raise e

async def close_db_connection():
    if db_instance.client is not None:
        await db_instance.client.close()
        logger.info("Closed MongoDB connection")

def get_db():
    return db_instance.db

async def create_indexes():
    if db_instance.db is None:
        return
    db = db_instance.db
    try:
        # 1. users: { email: 1 } unique
        await db.users.create_index(
            [("email", 1)],
            unique=True,
            name="uniq_email"
        )
        
        # 2. monitoring_sessions
        # { user_id: 1, started_at: -1 }
        await db.monitoring_sessions.create_index(
            [("user_id", 1), ("started_at", -1)],
            name="user_started"
        )
        # { user_id: 1 } unique, partial { is_live: true }
        await db.monitoring_sessions.create_index(
            [("user_id", 1)],
            unique=True,
            partialFilterExpression={"is_live": True},
            name="uniq_live_session_per_user"
        )
        # { user_id: 1, status: 1, started_at: -1 }
        await db.monitoring_sessions.create_index(
            [("user_id", 1), ("status", 1), ("started_at", -1)],
            name="user_status_started"
        )

        # 3. captured_moments
        # { user_id: 1, timestamp: -1 }
        await db.captured_moments.create_index(
            [("user_id", 1), ("timestamp", -1)],
            name="user_time"
        )
        # { user_id: 1, session_id: 1, timestamp: -1 }
        await db.captured_moments.create_index(
            [("user_id", 1), ("session_id", 1), ("timestamp", -1)],
            name="user_session_time"
        )
        # { user_id: 1, idempotency_key: 1 } unique
        await db.captured_moments.create_index(
            [("user_id", 1), ("idempotency_key", 1)],
            unique=True,
            name="user_idempotency_key"
        )
        # { session_id: 1 }
        await db.captured_moments.create_index(
            [("session_id", 1)],
            name="session_id_cascade"
        )
        logger.info("MongoDB indexes verified/created successfully.")
    except Exception as e:
        logger.warning(f"Error creating indexes: {e}")

