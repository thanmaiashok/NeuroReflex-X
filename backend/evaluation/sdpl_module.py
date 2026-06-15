import numpy as np

class SDPL:
    """
    4️⃣ Stereo Depth Precision Lock Module (SDPL)
    Checks depth/distance consistency. Identifies physics-breaking anomalies.
    """
    def __init__(self, max_phys_jump=2.0):
        self.max_phys_jump = max_phys_jump # Max distance target can physically move in 1 tick
        self.prev_pos = None
        
    def reset(self):
        self.prev_pos = None

    def evaluate_depth_anomaly(self, current_pos):
        current_pos = np.array(current_pos)
        is_anomaly = False
        
        if self.prev_pos is not None:
            distance_jump = np.linalg.norm(current_pos - self.prev_pos)
            # If the object 'teleports' further than physically possible in 1 tick
            if distance_jump > self.max_phys_jump:
                is_anomaly = True
                
        self.prev_pos = current_pos.copy()
        return is_anomaly
