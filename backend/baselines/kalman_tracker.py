import numpy as np


class KalmanTracker:
    """
    Real Kalman filter for 2D position tracking.
    State vector: [x, y, vx, vy]
    """

    def __init__(self, dt=1.0, process_noise=0.01, measurement_noise=0.1):
        self.dt = dt
        # State transition matrix
        self.F = np.array([
            [1, 0, dt, 0],
            [0, 1, 0, dt],
            [0, 0, 1,  0],
            [0, 0, 0,  1],
        ], dtype=float)
        # Observation matrix (observe x, y only)
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
        ], dtype=float)
        self.Q = np.eye(4) * process_noise      # process noise covariance
        self.R = np.eye(2) * measurement_noise  # measurement noise covariance
        self.P = np.eye(4)                      # state covariance
        self.x = np.zeros(4)                    # state [x, y, vx, vy]
        self.initialized = False

    def predict(self):
        """Advance state prior. Returns predicted [x, y]."""
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        return self.x[:2].copy()

    def update(self, measurement):
        """Fuse measurement with predicted state. Returns corrected [x, y]."""
        z = np.array(measurement, dtype=float)
        if not self.initialized:
            self.x[:2] = z
            self.initialized = True
            return self.x[:2].copy()
        # Innovation
        y = z - self.H @ self.x
        # Innovation covariance
        S = self.H @ self.P @ self.H.T + self.R
        # Kalman gain
        K = self.P @ self.H.T @ np.linalg.inv(S)
        # State update
        self.x = self.x + K @ y
        # Covariance update (Joseph form for numerical stability)
        I_KH = np.eye(4) - K @ self.H
        self.P = I_KH @ self.P
        return self.x[:2].copy()
