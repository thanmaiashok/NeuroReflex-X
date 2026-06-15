class PeripheralEventField:
    def __init__(self, threshold=0.2):
        self.threshold = threshold

    def detect_event(self, motion_energy):
        return motion_energy > self.threshold
