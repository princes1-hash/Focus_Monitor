import os
import time
from typing import Optional, Tuple
import joblib
import numpy as np
import pandas as pd

class EEGModelManager:
    _instance = None

    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(__file__))

        def find_candidate(filename: str, subfolder: str) -> str:
            candidates = [
                os.path.join(base_dir, subfolder, filename),
                os.path.join(base_dir, "..", subfolder, filename),
                os.path.join(base_dir, "..", filename),
                os.path.join(os.getcwd(), "backend", "app", subfolder, filename),
                os.path.join(os.getcwd(), filename),
                filename
            ]
            for p in candidates:
                if os.path.exists(p):
                    return os.path.abspath(p)
            return candidates[0]

        model_path = find_candidate("eeg_model.joblib", "ml")
        data_path = find_candidate("mock_eeg_stream.csv", "data")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"EEG model file not found at {model_path}")
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Mock EEG data file not found at {data_path}")

        self.model = joblib.load(model_path)
        self.stream_df = pd.read_csv(data_path)
        self.feature_cols = ['theta_power', 'alpha_power', 'beta_power', 'alpha_theta_ratio', 'alpha_beta_ratio']

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = EEGModelManager()
        return cls._instance

class EEGSimulator:
    def __init__(self):
        self.manager = EEGModelManager.get_instance()
        self.cursor: int = 0
        self.current_eeg_prob: float = 0.72 # EMA seed matching legacy
        self.last_update_time: float = 0.0
        self.has_inference: bool = False
        self.latest_at_ratio: Optional[float] = None
        self.latest_beta_power: Optional[float] = None
        self.latest_raw_prob: Optional[float] = None
        self.latest_calibrated_prob: Optional[float] = None

    def step(self) -> Tuple[float, float, float, float, float]:
        """
        Advances the EEG simulation by one step.
        Returns: (current_eeg_prob, raw_eeg_prob, calibrated_eeg, at_ratio, beta_power)
        """
        df = self.manager.stream_df
        cols = self.manager.feature_cols
        eeg_row = df.iloc[[self.cursor % len(df)]][cols]

        raw_eeg_prob = float(self.manager.model.predict_proba(eeg_row)[0][1])
        at_ratio = float(eeg_row['alpha_theta_ratio'].values[0])
        beta_power = float(eeg_row['beta_power'].values[0])

        calibrated_eeg = float(np.clip(raw_eeg_prob * 0.7 + (0.35 if at_ratio > 0.20 else 0.05), 0.05, 0.98))
        self.current_eeg_prob = round(0.6 * self.current_eeg_prob + 0.4 * calibrated_eeg, 3)

        self.cursor += 1
        self.has_inference = True
        self.latest_at_ratio = round(at_ratio, 3)
        self.latest_beta_power = beta_power
        self.latest_raw_prob = round(raw_eeg_prob, 3)
        self.latest_calibrated_prob = round(calibrated_eeg, 3)
        self.last_update_time = time.time()

        return (
            self.current_eeg_prob,
            self.latest_raw_prob,
            self.latest_calibrated_prob,
            self.latest_at_ratio,
            self.latest_beta_power
        )

    def tick_if_needed(self) -> bool:
        """Advance once per second of active wall time."""
        now = time.time()
        if now - self.last_update_time >= 1.0:
            self.step()
            return True
        return False

