import os
import gc
import glob
import json
import numpy as np
import pandas as pd
import mne
from scipy.signal import welch
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

MAX_SUBJECTS = 80
focused_flags = ['first_fix', 'second_fix', 'video', 'last_frame_video', 'scenario']

target_vis_cols = [
    'onset', 'success', 'gaze_angle_x', 'gaze_angle_y', 
    'pose_Rx', 'pose_Ry', 'pose_Rz', 'AU45_r', 'AU45_c'
]

# ==========================================
# PART 1: CRASH-PROOF VISION PIPELINE
# ==========================================
print(f"--- Starting Vision Extraction (Up to {MAX_SUBJECTS} Participants) ---")
vision_files = sorted(
    glob.glob('**/sub-*_task-fer_run-0_recording-videostream_physio.tsv*', recursive=True)
)[:MAX_SUBJECTS]

print(f"Found {len(vision_files)} Vision files.")

all_vision_dfs = []
column_names = None

for idx, tsv_path in enumerate(vision_files, 1):
    sub_id = os.path.basename(tsv_path).split('_')[0]
    try:
        # Load column names from the subject's matching JSON file (or fallback to previous)
        json_path = tsv_path.split('.tsv')[0] + '.json'
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                column_names = json.load(f).get('Columns', column_names)
        
        if not column_names:
            continue

        event_matches = glob.glob(f'**/{sub_id}_task-fer_run-0_events.tsv', recursive=True)
        if not event_matches:
            print(f"[{idx}/{len(vision_files)}] Skipping {sub_id} (no events.tsv found)")
            continue
        
        print(f"[{idx}/{len(vision_files)}] Processing Vision for {sub_id}...")
        events_df = pd.read_csv(event_matches[0], sep='\t')
        
        # Read TSV safely: skip malformed rows and coerce any weird text to NaN
        df = pd.read_csv(
            tsv_path, 
            sep='\t', 
            compression='infer', 
            names=column_names,
            usecols=[c for c in target_vis_cols if c in column_names],
            on_bad_lines='skip',
            low_memory=False
        )
        
        # Safely convert columns to float32 and drop any corrupted NaN rows
        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype(np.float32)
        df = df.dropna()

        df = df[df['success'] == 1].drop(columns=['success']).copy()
        if df.empty:
            print(f"   -> Warning: {sub_id} had 0 valid frames, skipping.")
            continue
        
        df['gaze_stability'] = (
            df['gaze_angle_x'].rolling(40, min_periods=1).std().fillna(0) + 
            df['gaze_angle_y'].rolling(40, min_periods=1).std().fillna(0)
        )
        df['head_stability'] = (
            df['pose_Rx'].rolling(40, min_periods=1).std().fillna(0) + 
            df['pose_Ry'].rolling(40, min_periods=1).std().fillna(0)
        )
        df['rolling_blinks'] = df['AU45_c'].rolling(120, min_periods=1).sum().fillna(0)
        
        df['target_state'] = 0
        for _, row in events_df.iterrows():
            if row['flag'] in focused_flags:
                mask = (df['onset'] >= row['onset']) & (df['onset'] <= (row['onset'] + row['duration']))
                df.loc[mask, 'target_state'] = 1
                
        g_thresh = df['gaze_stability'].quantile(0.75)
        h_thresh = df['head_stability'].quantile(0.75)
        df.loc[(df['gaze_stability'] > g_thresh) | (df['head_stability'] > h_thresh), 'target_state'] = 0
        
        all_vision_dfs.append(df)
        gc.collect()

    except Exception as e:
        print(f"   -> [SKIPPED] Corrupted or unreadable file for {sub_id}: {e}")
        continue

print(f"\nSuccessfully extracted Vision data from {len(all_vision_dfs)} participants!")
master_vision_df = pd.concat(all_vision_dfs, ignore_index=True)
del all_vision_dfs
gc.collect()

print(f"Total Combined Vision Frames: {len(master_vision_df)}")

feature_names = [c for c in master_vision_df.columns if c not in ['onset', 'target_state']]
X_vis = master_vision_df[feature_names]
y_vis = master_vision_df['target_state']

X_train, X_test, y_train, y_test = train_test_split(X_vis, y_vis, test_size=0.2, random_state=42, stratify=y_vis)

vision_model = RandomForestClassifier(
    n_estimators=100, 
    max_depth=12, 
    min_samples_leaf=10, 
    random_state=42, 
    n_jobs=2
)
vision_model.fit(X_train, y_train)

print(f"Multi-Subject Vision Accuracy: {accuracy_score(y_test, vision_model.predict(X_test))*100:.2f}%")
joblib.dump(vision_model, 'vision_model.joblib')
print("Saved generalized vision_model.joblib!\n")

del master_vision_df, X_vis, y_vis, X_train, X_test, y_train, y_test
gc.collect()

# ==========================================
# PART 2: CRASH-PROOF EEG PIPELINE
# ==========================================
print(f"--- Starting EEG Extraction (Up to {MAX_SUBJECTS} Participants) ---")
eeg_files = sorted(glob.glob('**/sub-*_task-fer_run-0_eeg.edf', recursive=True))[:MAX_SUBJECTS]
print(f"Found {len(eeg_files)} EEG files.")

all_eeg_dfs = []

for idx, edf_path in enumerate(eeg_files, 1):
    sub_id = os.path.basename(edf_path).split('_')[0]
    try:
        event_matches = glob.glob(f'**/{sub_id}_task-fer_run-0_events.tsv', recursive=True)
        if not event_matches:
            continue
            
        print(f"[{idx}/{len(eeg_files)}] Processing EEG for {sub_id}...")
        events_df = pd.read_csv(event_matches[0], sep='\t')
        
        raw = mne.io.read_raw_edf(edf_path, preload=False, verbose=False)
        sfreq = raw.info['sfreq']
        n_chans = min(10, len(raw.ch_names))
        eeg_data = raw.get_data(picks=range(n_chans))
        
        window_size = int(sfreq)
        step_size = int(sfreq / 2)
        eeg_rows = []
        
        for start_idx in range(0, eeg_data.shape[1] - window_size, step_size):
            segment = eeg_data[:, start_idx:start_idx + window_size]
            freqs, psd = welch(segment, fs=sfreq, nperseg=window_size)
            
            theta = np.mean(psd[:, (freqs >= 4) & (freqs <= 8)])
            alpha = np.mean(psd[:, (freqs > 8) & (freqs <= 12)])
            beta  = np.mean(psd[:, (freqs > 12) & (freqs <= 30)])
            
            eeg_rows.append({
                'onset': start_idx / sfreq,
                'theta_power': theta,
                'alpha_power': alpha,
                'beta_power': beta,
                'alpha_theta_ratio': alpha / (theta + 1e-12),
                'alpha_beta_ratio': alpha / (beta + 1e-12)
            })
            
        df_eeg = pd.DataFrame(eeg_rows).dropna()
        if df_eeg.empty:
            continue

        df_eeg['target_state'] = 0
        for _, row in events_df.iterrows():
            if row['flag'] in focused_flags:
                mask = (df_eeg['onset'] >= row['onset']) & (df_eeg['onset'] <= (row['onset'] + row['duration']))
                df_eeg.loc[mask, 'target_state'] = 1
                
        b_thresh = df_eeg['beta_power'].quantile(0.75)
        df_eeg.loc[df_eeg['beta_power'] > b_thresh, 'target_state'] = 0
        all_eeg_dfs.append(df_eeg)
        gc.collect()

    except Exception as e:
        print(f"   -> [SKIPPED] Corrupted or unreadable EEG file for {sub_id}: {e}")
        continue

print(f"\nSuccessfully extracted EEG data from {len(all_eeg_dfs)} participants!")
master_eeg_df = pd.concat(all_eeg_dfs, ignore_index=True)
print(f"Total Combined EEG Windows: {len(master_eeg_df)}")

eeg_cols = ['theta_power', 'alpha_power', 'beta_power', 'alpha_theta_ratio', 'alpha_beta_ratio']
X_eeg = master_eeg_df[eeg_cols]
y_eeg = master_eeg_df['target_state']

X_train_e, X_test_e, y_train_e, y_test_e = train_test_split(X_eeg, y_eeg, test_size=0.2, random_state=42, stratify=y_eeg)

eeg_model = RandomForestClassifier(
    n_estimators=100, 
    max_depth=12, 
    min_samples_leaf=5, 
    random_state=42, 
    n_jobs=2
)
eeg_model.fit(X_train_e, y_train_e)

print(f"Multi-Subject EEG Accuracy: {accuracy_score(y_test_e, eeg_model.predict(X_test_e))*100:.2f}%")
joblib.dump(eeg_model, 'eeg_model.joblib')
master_eeg_df.head(1000).to_csv('mock_eeg_stream.csv', index=False)
print("Saved generalized eeg_model.joblib and mock_eeg_stream.csv!")