import numpy as np


def compute_stability_curve(confidence_history, alpha=0.3):
    """
    EMA-smoothed confidence curve.
    alpha=0.3: weights recent frames more, damps single-frame spikes.
    Returns smoothed array of same length as input.
    """
    if len(confidence_history) == 0:
        return np.array([])
    smoothed = [float(confidence_history[0])]
    for val in confidence_history[1:]:
        smoothed.append(alpha * float(val) + (1.0 - alpha) * smoothed[-1])
    return np.array(smoothed)
