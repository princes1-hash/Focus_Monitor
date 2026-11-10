import pytest
import numpy as np
import pandas as pd
from app.services.vision_service import VisionModelManager, VisionFeatureExtractor
from app.services.eeg_service import EEGModelManager, EEGSimulator
from app.services.fusion_service import evaluate_late_fusion

def test_ml_models_load():
    vm = VisionModelManager.get_instance()
    em = EEGModelManager.get_instance()
    assert vm.vision_model is not None
    assert em.model is not None
    assert len(em.stream_df) == 1000

def test_late_fusion_strings():
    s1, c1, a1 = evaluate_late_fusion(0.8, 0.8)
    assert s1 == "True Meditative Stillness"
    assert c1 == "both_high"
    assert a1 is False

    s2, c2, a2 = evaluate_late_fusion(0.2, 0.2)
    assert s2 == "Attentional Drift (Restless)"
    assert c2 == "both_low"
    assert a2 is False

    s3, c3, a3 = evaluate_late_fusion(0.8, 0.2)
    assert s3 == "Unverified / Mismatch: Cognitive Wandering (Eyes Still, Mind Active)"
    assert c3 == "vision_high_eeg_low"
    assert a3 is True

    s4, c4, a4 = evaluate_late_fusion(0.2, 0.8)
    assert s4 == "Unverified / Mismatch: Physical Fidgeting (Body Moving, Mind Calm)"
    assert c4 == "vision_low_eeg_high"
    assert a4 is True

def test_eeg_simulator_advances():
    sim = EEGSimulator()
    prob, raw, cal, at, beta = sim.step()
    assert 0.05 <= prob <= 0.98
    assert sim.cursor == 1
    assert at is not None
    assert beta is not None

def test_vision_feature_extractor_scoring():
    extractor = VisionFeatureExtractor()
    feat_dict = {
        'gaze_angle_x': 0.01,
        'gaze_angle_y': -0.01,
        'pose_Rx': 0.02,
        'pose_Ry': -0.01,
        'pose_Rz': 0.005,
        'AU45_r': 0.0,
        'AU45_c': 0.0,
        'gaze_stability': 0.01,
        'head_stability': 0.01,
        'rolling_blinks': 0.0
    }
    vis_score, rf_prob, stillness = extractor.score(feat_dict)
    assert 0.02 <= vis_score <= 0.99
    assert 0.0 <= rf_prob <= 1.0
    assert 0.0 <= stillness <= 1.0

