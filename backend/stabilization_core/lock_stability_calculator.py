import numpy as np

def compute_stability(true_pos, pred_pos):
    error = np.linalg.norm(true_pos - pred_pos)
    return np.exp(-error)
