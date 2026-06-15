import numpy as np

def smooth_trajectory(prev_pred, current_pred, alpha=0.6):
    return alpha * current_pred + (1 - alpha) * prev_pred
