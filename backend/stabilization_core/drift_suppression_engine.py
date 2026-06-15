import numpy as np

class DriftSuppressionEngine:
    def correct(self, pred_pos, true_pos, strength=0.2):
        correction = strength * (true_pos - pred_pos)
        return pred_pos + correction
