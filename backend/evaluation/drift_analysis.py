import numpy as np

def compute_drift(true_history, pred_history):
    drift_values = [
        np.linalg.norm(t - p)
        for t, p in zip(true_history, pred_history)
    ]
    return drift_values
