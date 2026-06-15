import numpy as np

def compute_motp(true_positions, pred_positions):
    errors = [
        np.linalg.norm(t - p)
        for t, p in zip(true_positions, pred_positions)
    ]
    if not errors:
        return 0.0
    return float(np.mean(errors))

def compute_mota(total_frames, misses, false_positives, id_switches):
    if total_frames == 0:
        return 0.0
    return 1 - ((misses + false_positives + id_switches) / total_frames)
