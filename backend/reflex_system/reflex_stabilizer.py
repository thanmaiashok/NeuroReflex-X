import numpy as np

class ReflexStabilizer:
    def stabilize(self, noisy_position, last_stable_position, alpha=0.7):
        return alpha * noisy_position + (1 - alpha) * last_stable_position
