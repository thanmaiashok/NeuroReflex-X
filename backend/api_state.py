import numpy as np
import time

from backend.simulation_engine.motion_generator import MotionGenerator
from backend.cognitive_core.ibip_predictor import IBIP
from backend.evaluation.sdpl_module import SDPL
from backend.evaluation.acce_engine import ACCE
from backend.reflex_system.dual_fovea_selector import DualFoveaSelector
from backend.reflex_system.lgmd_looming import LGMDLoomingDetector

class SimulationState:
    def __init__(self):
        self.generator = MotionGenerator(max_speed=2.2) 
        self.generator.is_active = True # Start active immediately
        
        # 4-Core Framework Modules
        self.ibip = IBIP(history_size=10)
        self.sdpl = SDPL(max_phys_jump=2.0)
        self.acce = ACCE(collapse_threshold=0.25)
        self.dfaf = DualFoveaSelector(base_context=1.0, max_context=4.0)
        self.lgmd = LGMDLoomingDetector(threshold=0.25, alpha=0.35)
        
        self.true_pos = np.array([0.0, 0.0])
        self.predicted_pos = np.array([0.0, 0.0])
        self.history_true = []
        self.drone_pos = np.array([0.0, 0.0, 2.5]) # [X, Z, Y] -> Using Y for Height 
        self.status = "SEARCHING" 
        self.engaging_ticks = 0
        self.destroyed_until = 0
        self.lock_timer = 0.0 # Phase 15: Sustained Lock-On
        
        # Wind — real directional model
        self.time_elapsed = 0.0
        self.wind_enabled = True
        self.wind_angle   = np.pi / 6        # prevailing direction (radians, slowly drifts)
        self.wind_speed   = 3.0              # base m/s

        # Weather
        self.rain_enabled   = False
        self.weather_sunny  = False          # purely visual flag, no backend physics change

        # Phase 19: Real Telemetry Export (No fake data)
        self.full_session_history = []

    def get_spatial_wind(self, x, z, t):
        """
        Real directional wind: persistent bearing + gust cycle + small turbulence overlay.
        Slowly drifts direction over time so it feels alive but not chaotic.
        """
        # Slow direction drift — one full rotation takes ~20 minutes
        drifted_angle = self.wind_angle + np.sin(t * 0.008) * 0.4

        # Gust multiplier: 0.6–1.6× base speed, 11-second cycle
        gust = 1.0 + 0.5 * np.sin(t * 0.57)

        # Small positional turbulence on top (much lower amplitude than before)
        turb_x = np.sin(x * 0.06 + t * 0.35) * 0.5
        turb_z = np.cos(z * 0.06 - t * 0.28) * 0.5

        base_x = np.cos(drifted_angle) * self.wind_speed * gust + turb_x
        base_z = np.sin(drifted_angle) * self.wind_speed * gust + turb_z
        return np.array([base_x, base_z])

# Global Singleton instance
sim_state = SimulationState()
