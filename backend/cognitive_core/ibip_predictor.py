import numpy as np

class IBIP:
    """
    2️⃣ Intent-Based Interception Predictor (IBIP)
    Uses Exponential Moving Average (EMA) filtering on positions and velocities
    for a stable, noise-resistant trajectory prediction.

    Stability improvements:
    - EMA on raw input positions (smooths out sensor noise before velocity calc)
    - EMA on velocity history (weights recent motion more, damps old jitter)
    - Clamped acceleration contribution (prevents noise spikes from destabilising)
    - EMA on final prediction output (last-mile smoothing)
    """

    def __init__(self, history_size=10, pos_alpha=0.35, vel_alpha=0.4, out_alpha=0.45):
        """
        Args:
            history_size : how many frames to keep
            pos_alpha    : EMA weight for position filter (lower = smoother)
            vel_alpha    : EMA weight for velocity filter (lower = smoother)
            out_alpha    : EMA weight for output prediction (lower = smoother)
        """
        self.history_size = history_size
        self.pos_alpha    = pos_alpha
        self.vel_alpha    = vel_alpha
        self.out_alpha    = out_alpha
        self.reset()

    def reset(self):
        self.positions       = []
        self.velocities      = []
        self.ema_pos         = None   # EMA-filtered position
        self.ema_vel         = None   # EMA-filtered velocity
        self.ema_accel       = np.zeros(2) # EMA-filtered acceleration
        self.ema_prediction  = None   # EMA-filtered output prediction

    def _ema(self, prev, current, alpha):
        """Exponential Moving Average: blends previous EMA with new value."""
        if prev is None:
            return np.array(current, dtype=float)
        return alpha * np.array(current, dtype=float) + (1.0 - alpha) * prev

    def update_and_predict(self, current_pos):
        current_pos = np.array(current_pos, dtype=float)

        # ── Step 1: EMA-filter the raw (noisy) input position ──────────────
        self.ema_pos = self._ema(self.ema_pos, current_pos, self.pos_alpha)

        self.positions.append(self.ema_pos.copy())
        if len(self.positions) > self.history_size:
            self.positions.pop(0)

        if len(self.positions) < 2:
            self.ema_prediction = self._ema(self.ema_prediction, current_pos, self.out_alpha)
            return self.ema_prediction.tolist(), np.zeros(2), np.zeros(2)

        # ── Step 2: Velocity from EMA positions (much lower noise) ──────────
        raw_vel = self.positions[-1] - self.positions[-2]

        # ── Step 3: EMA-filter the velocity (damps jitter in motion trend) ──
        self.ema_vel = self._ema(self.ema_vel, raw_vel, self.vel_alpha)

        self.velocities.append(self.ema_vel.copy())
        if len(self.velocities) > self.history_size:
            self.velocities.pop(0)

        # ── Step 4: Acceleration — clamped to prevent noise spikes ──────────
        raw_accel = np.zeros(2)
        if len(self.velocities) >= 2:
            raw_accel = self.velocities[-1] - self.velocities[-2]
            # Clamp: don't let a single noisy frame spike the acceleration
            max_accel = 0.3
            raw_accel = np.clip(raw_accel, -max_accel, max_accel)
        
        # EMA for acceleration stability (dragonfly-style intent detection)
        self.ema_accel = self._ema(self.ema_accel, raw_accel, 0.2)

        # ── Step 5: Predict next position ───────────────────────────────────
        # Classic kinematic: pos + vel + 0.5*accel  (uses EMA values)
        raw_prediction = self.ema_pos + self.ema_vel + (0.5 * self.ema_accel)

        # ── Step 6: EMA on the final prediction output (last-mile smoothing) ─
        self.ema_prediction = self._ema(self.ema_prediction, raw_prediction, self.out_alpha)

        return self.ema_prediction.tolist(), self.ema_vel, self.ema_accel

    def adapt_to_distance(self, dist: float):
        """Bat-ranging: fast alpha when close (react quick), slow when far (stay smooth)."""
        if dist < 5.0:
            self.pos_alpha = 0.60
            self.vel_alpha = 0.55
        elif dist < 15.0:
            t = (dist - 5.0) / 10.0        # 0→1 as dist goes 5→15
            self.pos_alpha = 0.60 - t * 0.40   # 0.60 → 0.20
            self.vel_alpha = 0.55 - t * 0.35   # 0.55 → 0.20
        else:
            self.pos_alpha = 0.20
            self.vel_alpha = 0.20
