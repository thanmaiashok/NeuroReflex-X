from collections import deque
import numpy as np

class TemporalMemoryBank:
    def __init__(self, max_len=10):
        self.memory = deque(maxlen=max_len)

    def add(self, state):
        self.memory.append(state)

    def get_sequence(self):
        return np.array(self.memory)
