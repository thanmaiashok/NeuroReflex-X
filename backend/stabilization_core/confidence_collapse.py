class ConfidenceCollapse:
    def __init__(self, threshold=0.6):
        self.threshold = threshold

    def compute_confidence(self, visual_score, motion_score, depth_score):
        return visual_score * motion_score * depth_score

    def should_collapse(self, confidence):
        return confidence < self.threshold
