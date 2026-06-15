import numpy as np

class InstabilityMapper:
    def map_instability(self, confidence_history):
        return np.var(confidence_history)
