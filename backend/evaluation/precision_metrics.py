import numpy as np


def compute_precision(true_pos, pred_pos, threshold=5.0):
    """
    Tracking precision: 1.0 at zero error, 0.0 at threshold metres.
    threshold=5.0m is a realistic bound for close-range drone tracking.
    """
    error = float(np.linalg.norm(np.array(true_pos) - np.array(pred_pos)))
    return max(0.0, 1.0 - (error / threshold))
