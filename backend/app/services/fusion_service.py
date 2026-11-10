from typing import Tuple

def evaluate_late_fusion(vis_prob: float, eeg_prob: float) -> Tuple[str, str, bool]:
    vis_focused = vis_prob >= 0.50
    eeg_focused = eeg_prob >= 0.50

    if vis_focused and eeg_focused:
        return "True Meditative Stillness", "both_high", False
    elif not vis_focused and not eeg_focused:
        return "Attentional Drift (Restless)", "both_low", False
    elif vis_focused and not eeg_focused:
        return "Unverified / Mismatch: Cognitive Wandering (Eyes Still, Mind Active)", "vision_high_eeg_low", True
    else:
        return "Unverified / Mismatch: Physical Fidgeting (Body Moving, Mind Calm)", "vision_low_eeg_high", True

