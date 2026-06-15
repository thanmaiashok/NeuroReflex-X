import numpy as np

def random_acceleration(scale=0.2):
    return np.random.uniform(-scale, scale, size=2)

def sudden_direction_change(velocity):
    return -velocity
