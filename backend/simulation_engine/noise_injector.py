import numpy as np

def add_noise(position, noise_level=0.05):
    noise = np.random.normal(0, noise_level, size=2)
    return position + noise
