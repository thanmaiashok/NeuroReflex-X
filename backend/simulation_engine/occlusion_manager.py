import numpy as np

class OcclusionManager:
    def __init__(self, probability=0.1):
        self.probability = probability

    def is_occluded(self):
        return np.random.rand() < self.probability
