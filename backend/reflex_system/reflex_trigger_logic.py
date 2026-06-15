class ReflexTrigger:
    def __init__(self):
        self.active = False

    def update(self, event_detected):
        self.active = event_detected
        return self.active
