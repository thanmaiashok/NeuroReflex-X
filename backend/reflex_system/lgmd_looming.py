import numpy as np


class LGMDLoomingDetector:
    """
    Locust Giant Movement Detector (LGMD) — Looming Reflex
    Fires when target's angular size expands rapidly (target closing fast).
    Injects early-warning looming_rate into ACCE to proactively drain confidence
    before prediction error rises — faster collapse trigger than error-based drain.
    """

    def __init__(self, threshold: float = 0.25, alpha: float = 0.35):
        self.threshold = threshold      # EMA looming rate that triggers warning
        self.alpha = alpha              # EMA smoothing factor
        self.prev_angular_size: float | None = None
        self.ema_looming_rate: float = 0.0

    def reset(self):
        self.prev_angular_size = None
        self.ema_looming_rate = 0.0

    def evaluate(self, dist_to_target: float, ref_size: float = 1.0) -> tuple[float, bool]:
        """
        Args:
            dist_to_target : 2D XZ distance from drone to target (metres)
            ref_size       : approximate physical width of target (metres)
        Returns:
            looming_rate   : float ≥ 0 — rate of angular expansion (EMA smoothed)
            is_looming     : bool — True when rate exceeds threshold
        """
        dist = max(dist_to_target, 0.1)
        angular_size = ref_size / dist      # small-angle approx: θ ≈ size / dist

        if self.prev_angular_size is not None:
            raw_rate = angular_size - self.prev_angular_size
            self.ema_looming_rate = (
                self.alpha * raw_rate + (1.0 - self.alpha) * self.ema_looming_rate
            )
            looming_rate = max(0.0, self.ema_looming_rate)  # only expansion matters
        else:
            looming_rate = 0.0

        self.prev_angular_size = angular_size
        return looming_rate, looming_rate > self.threshold
