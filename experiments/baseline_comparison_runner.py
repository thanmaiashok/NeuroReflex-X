import numpy as np
from backend.baselines.kalman_tracker import KalmanTracker

def run_baseline_comparison(frames=200):
    kalman = KalmanTracker()
    true_pos = np.array([0.0, 0.0])

    for _ in range(frames):
        true_pos += np.array([1.0, 0.5])
        kalman.update(true_pos)
        pred = kalman.predict()

    print("Baseline comparison complete.")

if __name__ == "__main__":
    run_baseline_comparison()
