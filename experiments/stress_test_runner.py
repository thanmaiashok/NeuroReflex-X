import numpy as np
from backend.simulation_engine.motion_generator import MotionGenerator
from backend.simulation_engine.noise_injector import add_noise

def run_stress_test(frames=200):
    generator = MotionGenerator()

    for _ in range(frames):
        true_pos, _ = generator.update()
        noisy = add_noise(true_pos, noise_level=0.5)

    print("Stress test completed.")

if __name__ == "__main__":
    run_stress_test()
