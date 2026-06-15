from .motion_generator import MotionGenerator

class MultiTargetManager:
    def __init__(self, num_targets=3):
        self.targets = [MotionGenerator() for _ in range(num_targets)]

    def update_all(self):
        states = []
        for t in self.targets:
            pos, vel = t.update()
            states.append((pos, vel))
        return states
