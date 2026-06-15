class GroundTruthTracker:
    def __init__(self):
        self.history = []

    def log(self, position):
        self.history.append(position)

    def get_history(self):
        return self.history
