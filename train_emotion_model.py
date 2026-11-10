import os
import gc
import glob
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

MAX_SUBJECTS = 80

au_cols = [
    'AU01_r', 'AU02_r', 'AU04_r', 'AU05_r', 
    'AU06_r', 'AU07_r', 'AU09_r', 'AU12_r', 
    'AU15_r', 'AU17_r', 'AU25_r', 'AU26_r'
]

emotion_flags = ['scenario', 'video', 'last_frame_video']

print("--- Starting AFFEC Emotion Model Extraction ---")
vision_files = sorted(
    glob.glob('**/sub-*_task-fer_run-0_recording-videostream_physio.tsv*', recursive=True)
)[:MAX_SUBJECTS]

all_emotion_dfs = []

for idx, tsv_path in enumerate(vision_files, 1):
    sub_id = os.path.basename(tsv_path).split('_')[0]
    try:
        event_matches = glob.glob(f'**/{sub_id}_task-fer_run-0_events.tsv', recursive=True)
        if not event_matches:
            continue
        
        events_df = pd.read_csv(event_matches[0], sep='\t')
        
        # Read CSV/TSV letting Pandas infer headers automatically!
        df = pd.read_csv(
            tsv_path, 
            sep='\t', 
            compression='infer', 
            header=0,
            on_bad_lines='skip',
            low_memory=False
        )
        
        # Keep only onset, success, and any matching AU columns present in this file
        available_cols = ['onset'] + [c for c in au_cols if c in df.columns]
        if 'success' in df.columns:
            available_cols.append('success')
            
        df = df[[c for c in available_cols if c in df.columns]].copy()
        
        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype(np.float32)
        df = df.dropna()

        if 'success' in df.columns:
            df = df[df['success'] == 1].drop(columns=['success']).copy()
            
        if df.empty:
            continue

        df['emotion_label'] = None
        for _, row in events_df.iterrows():
            if row['flag'] in emotion_flags and pd.notna(row['trial_type']):
                mask = (df['onset'] >= row['onset']) & (df['onset'] <= (row['onset'] + row['duration']))
                df.loc[mask, 'emotion_label'] = str(row['trial_type']).strip().lower()

        labeled_df = df.dropna(subset=['emotion_label']).copy()
        if not labeled_df.empty:
            all_emotion_dfs.append(labeled_df)
            print(f"[{idx}/{len(vision_files)}] Extracted {len(labeled_df)} emotion frames from {sub_id}")
        
        gc.collect()

    except Exception as e:
        print(f"[{idx}/{len(vision_files)}] Skipped {sub_id}: {e}")
        continue

if not all_emotion_dfs:
    print("Error: No emotion data extracted. Check file paths.")
    exit()

master_emo_df = pd.concat(all_emotion_dfs, ignore_index=True)
del all_emotion_dfs
gc.collect()

print(f"\nTotal Combined AFFEC Emotion Frames: {len(master_emo_df)}")
print("AFFEC Ground-Truth Emotion Distribution:")
print(master_emo_df['emotion_label'].value_counts())

present_au = [c for c in au_cols if c in master_emo_df.columns]
X_emo = master_emo_df[present_au]
y_emo = master_emo_df['emotion_label']

X_train, X_test, y_train, y_test = train_test_split(
    X_emo, y_emo, test_size=0.2, random_state=42, stratify=y_emo
)

emotion_model = RandomForestClassifier(
    n_estimators=120,
    max_depth=14,
    min_samples_leaf=5,
    class_weight='balanced',
    random_state=42,
    n_jobs=2
)
emotion_model.fit(X_train, y_train)

y_pred = emotion_model.predict(X_test)
print(f"\nAFFEC Emotion Model Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
print("Classes learned:", emotion_model.classes_.tolist())

joblib.dump(emotion_model, 'emotion_model.joblib')
print("Saved AFFEC-trained emotion_model.joblib!")