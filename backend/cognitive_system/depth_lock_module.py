import numpy as np

class DepthLockModule:
    def compute_depth(self, position):
        # pseudo depth = distance from origin
        return np.linalg.norm(position)

    def depth_stability(self, d_prev, d_curr):
        return np.exp(-abs(d_curr - d_prev))
