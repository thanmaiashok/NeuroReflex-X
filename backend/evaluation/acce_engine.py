import numpy as np

class ACCE:
    """
    3️⃣ Adaptive Confidence Collapse Engine (ACCE)
    Evaluates tracking stability. If confidence drops, triggers a system collapse to Reflex.

    Stability improvements (matched to smoothed IBIP output):
    - Lower error_penalty multiplier (EMA-smoothed IBIP produces smaller errors)
    - Faster recovery rate when stable
    - Collapse threshold lowered slightly so system doesn't over-collapse
    """
    def __init__(self, collapse_threshold=0.25):
        self.collapse_threshold = collapse_threshold
        self.confidence_score   = 1.0
        self.is_collapsed       = False
        self.error_history      = [] # For visual stability grading

    def reset(self):
        self.confidence_score = 1.0
        self.is_collapsed     = False
        self.error_history    = []

    def evaluate(self, prediction_error, velocity_variance, depth_anomaly, looming_rate=0.0):
        """
        Dynamically grades prediction quality.
        Logic: Stable until failure. It shouldn't flicker.
        """
        # Absolute collapse on depth anomaly (physics-breaking jump)
        if depth_anomaly:
            self.confidence_score = 0.0
            self.is_collapsed     = True
            return self.confidence_score, self.is_collapsed, 0.0

        # LGMD looming: target closing fast → pre-emptive confidence drain
        if looming_rate > 0.0:
            self.confidence_score = max(0.0, self.confidence_score - looming_rate * 0.5)

        # ── Step 1: Track Visual Stability (Jitter Analysis) ────────────────
        self.error_history.append(prediction_error)
        if len(self.error_history) > 15:
            self.error_history.pop(0)
            
        avg_error = np.mean(self.error_history) if self.error_history else 0.0
        jitter = np.std(self.error_history) if len(self.error_history) > 5 else 0.0
        
        # visual_stability: 1.0 = rock solid, 0.0 = extreme jitter
        visual_stability = max(0.0, 1.0 - (jitter * 3.0))

        # ── Step 2: Hysteresis / Inertial Trust Logic ──────────────────────
        # We don't drop trust for every little bump. 
        # Only if average error or jitter suggests the "thread" is lost.

        # If current error is twice the average, we are starting to drift
        drift_spike = max(0, prediction_error - (avg_error * 1.5))
        
        # Baseline minor drain to keep it dynamic but slow
        drain = 0.01 
        
        # Serious penalty only if avg_error is high or there's a spike
        if avg_error > 0.4 or drift_spike > 0.3:
            drain = (avg_error * 0.4) + (drift_spike * 0.8)
            # Instability makes it drain even faster
            drain *= (2.0 - visual_stability)

        if avg_error < 0.15 and jitter < 0.05:
            # Very stable → high recovery (0.05 per frame = 1s to full)
            self.confidence_score = min(1.0, self.confidence_score + 0.08)
        elif avg_error < 0.25:
            # Moderately stable → slow recovery
            self.confidence_score = min(1.0, self.confidence_score + 0.02)
        else:
            # Unstable zone → drain confidence
            self.confidence_score -= drain

        self.confidence_score = max(0.0, self.confidence_score)

        # Collapse logic: If it drops below threshold, stay collapsed until it recovers significantly
        if self.is_collapsed:
            # Need to get back to 0.5 to 're-engage' brain
            if self.confidence_score > 0.5:
                self.is_collapsed = False
        else:
            if self.confidence_score < self.collapse_threshold:
                self.is_collapsed = True

        return self.confidence_score, self.is_collapsed, visual_stability
