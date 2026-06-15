class AdaptiveScheduler:
    def __init__(self, brain_interval=5):
        self.brain_interval = brain_interval
        self.counter = 0

    def should_run_brain(self):
        self.counter += 1
        if self.counter >= self.brain_interval:
            self.counter = 0
            return True
        return False
