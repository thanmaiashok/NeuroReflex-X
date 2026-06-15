import numpy as np

def compute_motion_energy(prev_pos, current_pos):
    return np.linalg.norm(current_pos - prev_pos)
