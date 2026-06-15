import numpy as np

class ThresholdOptimizer:
    def __init__(self, initial_threshold=0.6):
        self.threshold = initial_threshold

    def update(self, recent_stability):
        adjustment = 0.01 * (0.8 - recent_stability)
        self.threshold += adjustment
        self.threshold = np.clip(self.threshold, 0.3, 0.9)
        return self.threshold
