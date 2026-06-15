import numpy as np
import gymnasium as gym
from gymnasium import spaces
from pettingzoo import ParallelEnv
from pettingzoo.utils import wrappers
import math

# We must import the exact physics modules from the backend
from backend.simulation_engine.motion_generator import MotionGenerator
from backend.api_state import sim_state, SimulationState

class PredatorPreyEnv(ParallelEnv):
    metadata = {'render_modes': ['human'], "name": "predator_prey_v0"}

    def __init__(self):
        # Two agents: the Predator (Drone) and the Prey (Target)
        self.possible_agents = ["predator", "prey"]
        self.agents = self.possible_agents[:]
        
        # We use a separate dedicated SimulationState so training doesn't step on API usage
        self.env_state = SimulationState()
        self.env_state.generator.generate_forest(40) # Train in forest
        self.env_state.wind_enabled = True

        # Explicitly define render_mode for supersuit compatibility
        self.render_mode = "human"
        
        # Action Spaces
        # Predator Drone: 
        # [0] Pitch (-1 to 1) -> Forward/Back Speed
        # [1] Yaw (-1 to 1) -> Turning
        # [2] Throttle (-1 to 1) -> Altitude Change Rate
        # Prey Target:
        # [0] Throttle (-1 to 1) -> Forward/Back
        # [1] Turn (-1 to 1) -> Rotation
        self.action_spaces = {
            "predator": spaces.Box(low=-1.0, high=1.0, shape=(3,), dtype=np.float32),
            "prey": spaces.Box(low=-1.0, high=1.0, shape=(2,), dtype=np.float32)
        }

        # Observation Spaces
        # Must give each agent info to learn.
        # Predator: Rel Target Pos (2), Wind Vector (2), Current Altitude (1), Local Radar (4)
        # Prey: Rel Drone Pos (2), Wind Vector (2), Nearest Obstacle Dist (1)
        self.observation_spaces = {
            "predator": spaces.Box(low=-np.inf, high=np.inf, shape=(9,), dtype=np.float32),
            "prey": spaces.Box(low=-np.inf, high=np.inf, shape=(5,), dtype=np.float32)
        }

        # State tracking
        self.predator_xz = np.array([0.0, 0.0])
        self.predator_y = 2.5
        self.predator_heading = 0.0
        
        self.prey_xz = np.array([10.0, 10.0])
        self.prey_heading = 0.0
        
        self.step_count = 0
        self.max_steps = 2000
        
        # Curriculum constraints
        self.wind_multiplier = 1.0
        self.wind_turbulence = 1.0
        self.prey_aggro = 1.0

    def apply_curriculum(self, config):
        """Called dynamically by the Groq LLM Director to change reality between training epochs."""
        self.wind_multiplier = config.get("wind_speed_multiplier", 1.0)
        self.wind_turbulence = config.get("wind_turbulence_freq", 1.0)
        self.prey_aggro = config.get("prey_aggressiveness", 1.0)
        obs_count = config.get("obstacle_density", 40)
        
        # Physically respawn the forest with new density
        self.env_state.generator.generate_forest(obs_count)

    def reset(self, seed=None, options=None):
        self.agents = self.possible_agents[:]
        self.env_state = SimulationState()
        self.env_state.generator.generate_forest(40)
        
        # Spawn randomly in map
        self.predator_xz = np.random.uniform(-40, 40, size=2)
        self.predator_y = self.env_state.generator.get_height(*self.predator_xz) + 2.5
        self.predator_heading = np.random.uniform(0, 2 * math.pi)
        
        self.prey_xz = np.random.uniform(-40, 40, size=2)
        self.prey_heading = np.random.uniform(0, 2 * math.pi)
        
        self.step_count = 0
        
        obs = self._get_obs()
        infos = {agent: {} for agent in self.agents}
        return obs, infos

    def _get_obs(self):
        # 1. Wind Physics (Real Fluid Dynamics)
        wind = self.env_state.get_spatial_wind(self.predator_xz[0], self.predator_xz[1], self.step_count * 0.1)
        
        # 2. Predator Radar — directional distance to nearest obstacle per sector
        radar = np.array([10.0, 10.0, 10.0, 10.0])  # Front, Back, Left, Right
        for obs in self.env_state.generator.obstacles:
            delta = obs[:2] - self.predator_xz
            dist = np.linalg.norm(delta)
            if 0 < dist < 10.0:
                angle = math.atan2(delta[1], delta[0]) - self.predator_heading
                angle = (angle + math.pi) % (2 * math.pi) - math.pi  # normalize to [-pi, pi]
                if -math.pi / 4 <= angle < math.pi / 4:
                    radar[0] = min(radar[0], dist)   # Front
                elif math.pi / 4 <= angle < 3 * math.pi / 4:
                    radar[3] = min(radar[3], dist)   # Right
                elif angle >= 3 * math.pi / 4 or angle < -3 * math.pi / 4:
                    radar[1] = min(radar[1], dist)   # Back
                else:
                    radar[2] = min(radar[2], dist)   # Left
                
        # 3. Target relative pos
        rel_pos = self.prey_xz - self.predator_xz
        
        pred_obs = np.concatenate([
            rel_pos,               # Where is the target?
            wind,                  # What is the wind pushing me?
            [self.predator_y],     # How high am I?
            radar                  # Am I going to hit a tree?
        ]).astype(np.float32)
        
        prey_obs = np.concatenate([
            -rel_pos,              # Where is the drone?
            wind,                  # What is the wind?
            [radar[0]]             # Nearest obstacle to hide behind?
        ]).astype(np.float32)

        return {"predator": pred_obs, "prey": prey_obs}

    def step(self, actions):
        dt = 0.1
        self.step_count += 1
        
        rewards = {"predator": 0.0, "prey": 0.0}
        terminations = {"predator": False, "prey": False}
        truncations = {"predator": False, "prey": False}
        
        if not self.agents:
            return {}, {}, {}, {}, {}

        # --------------------------------
        # APPLY REAL PHYSICS FROM ACTIONS
        # --------------------------------
        
        # 1. Prey Movement
        if "prey" in actions:
            prey_act = actions["prey"]
            prey_throttle = prey_act[0] * 3.0 * self.prey_aggro # Max 3m/s * aggro map
            self.prey_heading += prey_act[1] * 0.5 * self.prey_aggro # Max turn rate
            
            motion = np.array([math.cos(self.prey_heading), math.sin(self.prey_heading)]) * prey_throttle * dt
            self.prey_xz += motion
            # Map bound clamp
            self.prey_xz = np.clip(self.prey_xz, -148.0, 148.0)

        # 2. Predator Movement & Wind
        if "predator" in actions:
            pred_act = actions["predator"]
            pred_pitch_speed = pred_act[0] * 15.0 # Max speed 15m/s
            self.predator_heading += pred_act[1] * 0.5
            pred_throttle_v = pred_act[2] * 2.0 # Vertical climb/dive 2m/s
            
            # Intended move
            drone_intent = np.array([math.cos(self.predator_heading), math.sin(self.predator_heading)]) * pred_pitch_speed * dt
            
            # REAL Spatial Wind Physics scaled by LLM Curriculum
            wind = self.env_state.get_spatial_wind(self.predator_xz[0], self.predator_xz[1], self.step_count * dt * self.wind_turbulence)
            wind = wind * self.wind_multiplier
            
            # Apply True Dynamics
            self.predator_xz += drone_intent + (wind * dt)
            self.predator_xz = np.clip(self.predator_xz, -148.0, 148.0)
            
            self.predator_y += pred_throttle_v * dt

        # --------------------------------
        # REWARD & PUNISHMENT RULES
        # --------------------------------
        dist = np.linalg.norm(self.predator_xz - self.prey_xz)
        ground_h = self.env_state.generator.get_height(self.predator_xz[0], self.predator_xz[1])
        
        crashed = self.predator_y < ground_h
        caught = dist < 2.0 and self.predator_y < (ground_h + 3.0)
        
        # Predator Rewards
        if crashed:
            rewards["predator"] = -100.0 # Fatal penalty
            terminations["predator"] = True
            terminations["prey"] = True # Round ends
        elif caught:
            rewards["predator"] = 100.0 # Kill strike success
            rewards["prey"] = -100.0 # Prey dies
            terminations["predator"] = True
            terminations["prey"] = True
        else:
            # Continual shaping rewards
            # Predator gets points for being close AND low
            rewards["predator"] = -dist * 0.01 
            # Prey gets points for surviving and creating distance
            rewards["prey"] = dist * 0.01 + 0.1 # Survival bonus

        # Check Timeout
        if self.step_count >= self.max_steps:
            truncations = {"predator": True, "prey": True}
            
        if terminations["predator"] or truncations["predator"]:
            self.agents = []

        obs = self._get_obs()
        infos = {"predator": {}, "prey": {}}
        
        return obs, rewards, terminations, truncations, infos

    def render(self):
        pass

    def observation_space(self, agent):
        return self.observation_spaces[agent]

    def action_space(self, agent):
        return self.action_spaces[agent]
