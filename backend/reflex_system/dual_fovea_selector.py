import numpy as np

class DualFoveaSelector:
    """
    1️⃣ Dual-Fovea Adaptive Focus Algorithm (DFAF)
    Hawk-inspired focus mechanism.

    Primary Fovea  — tight lock on the IBIP predicted position (precision)
    Secondary Fovea — context window displaced along velocity direction (awareness)

    When motion is fast/sudden:
      - Secondary fovea expands outward (large context_radius)
      - Separation between foveas grows → system maintains peripheral awareness
    When motion is calm:
      - Both foveas converge → tight precision lock
    """

    def __init__(self, base_context=1.0, max_context=4.0):
        self.base_context = base_context   # Minimum context radius
        self.max_context  = max_context    # Maximum context radius
        self._ema_vel     = np.zeros(2)    # EMA of velocity for focus direction
        self.vel_alpha    = 0.3            # EMA smoothing

    def select(self, predicted_pos, velocity, acceleration, base_radius=1.0):
        """
        Args:
            predicted_pos  : IBIP prediction [x, y]
            velocity       : IBIP EMA velocity vector [vx, vy]
            acceleration   : IBIP EMA acceleration vector [ax, ay]
            base_radius    : Minimum focus radius
        Returns:
            primary_fovea  : [x, y] — precision lock point
            secondary_fovea: [x, y] — context awareness point
            focus_separation: float — distance between the two foveas (metric)
        """
        primary = np.array(predicted_pos, dtype=float)
        vel = np.array(velocity, dtype=float)
        accel = np.array(acceleration, dtype=float)

        # Update EMA velocity for stable focus direction
        self._ema_vel = self.vel_alpha * vel + (1.0 - self.vel_alpha) * self._ema_vel
        
        vel_mag = np.linalg.norm(self._ema_vel)
        accel_mag = np.linalg.norm(accel)

        # 🦅 HAWK LOGIC: 
        # Context Radius expands with ACCELERATION (sudden change of intent)
        # focus_separation expands with VELOCITY (fast motion awareness)
        
        adaptive_context = base_radius + (accel_mag * 15.0) # Sensitivity to sudden turns
        adaptive_context = min(self.max_context, adaptive_context)

        # Secondary fovea = primary displaced in velocity direction
        if vel_mag > 1e-4:
            vel_dir = self._ema_vel / vel_mag
            # Separation depends on speed
            separation = 1.0 + (vel_mag * 2.0)
        else:
            vel_dir = np.array([1.0, 0.0])
            separation = 1.0

        secondary = primary + vel_dir * separation

        # Focus separation metric for UI
        focus_separation = float(np.linalg.norm(secondary - primary))

        return primary.tolist(), secondary.tolist(), focus_separation, adaptive_context
