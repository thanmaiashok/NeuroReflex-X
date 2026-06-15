import numpy as np
from backend.baselines.kalman_tracker import KalmanTracker


class SortTracker:
    """
    SORT-style single-object tracker.
    Each update() runs a full Kalman predict-correct cycle with measurement gating.
    Outlier measurements beyond gate_distance are rejected; state coasts on prediction.
    """

    def __init__(self, gate_distance=10.0):
        self.kf = KalmanTracker()
        self.gate_distance = gate_distance  # max plausible jump in metres

    def predict(self):
        """Peek at predicted next position without advancing filter state."""
        if not self.kf.initialized:
            return np.zeros(2)
        return (self.kf.F @ self.kf.x)[:2].copy()

    def update(self, position):
        """
        Advance filter state then fuse measurement.
        Returns corrected [x, y] estimate.
        """
        position = np.array(position, dtype=float)

        # Predict step: advance state prior
        predicted = self.kf.predict()

        # Gate: reject measurement if it violates max physical displacement
        if self.kf.initialized:
            dist = np.linalg.norm(position - predicted)
            if dist > self.gate_distance:
                return predicted  # coast on prediction; skip bad measurement

        # Correct step: fuse measurement into state
        return self.kf.update(position)
