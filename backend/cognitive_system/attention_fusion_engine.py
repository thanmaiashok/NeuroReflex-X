import numpy as np

class AttentionFusionEngine:
    def fuse(self, reflex_pos, brain_pos, confidence):
        return confidence * brain_pos + (1 - confidence) * reflex_pos
