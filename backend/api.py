from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import numpy as np
import base64
import time
import os
import subprocess
import json

from backend.simulation_engine.motion_generator import MotionGenerator
from backend.simulation_engine.noise_injector import add_noise
from backend.evaluation.precision_metrics import compute_precision
from backend.cognitive_core.ibip_predictor import IBIP
from backend.evaluation.sdpl_module import SDPL
from backend.evaluation.acce_engine import ACCE
from backend.reflex_system.dual_fovea_selector import DualFoveaSelector

from backend.api_state import sim_state, SimulationState

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimulationStepResponse(BaseModel):
    true_pos: list[float]
    predicted_pos: list[float]
    history_true: list[dict]
    precision: float
    stability: float
    destination: list[float] | None
    status: str
    obstacles: list[list[float]]
    sonar_active: bool
    collapse_status: bool
    context_radius: float
    primary_fovea: list[float]
    secondary_fovea: list[float]
    focus_separation: float
    drone_real_pos: list[float] | None
    reflex_energy: float
    wind_angle: float
    wind_speed: float
    rain_active: bool
    weather_sunny: bool

class TargetRequest(BaseModel):
    x: float
    y: float

class TargetModeRequest(BaseModel):
    mode: str 

class ObstacleRequest(BaseModel):
    x: float
    y: float
    h: float = 1.8

@app.post("/simulation/step", response_model=SimulationStepResponse)
async def step_simulation():
    current_time = time.time()
    
    
    # Logic: Automatic respawn timer
    if sim_state.status == "DESTROYED":
        if current_time < sim_state.destroyed_until:
             return {
                "true_pos": sim_state.true_pos.tolist(),
                "predicted_pos": sim_state.predicted_pos.tolist(),
                "history_true": sim_state.history_true,
                "precision": 1.0,
                "stability": 0.0,
                "destination": None,
                "status": "DESTROYED",
                "obstacles": [o.tolist() for o in sim_state.generator.obstacles],
                "sonar_active": sim_state.history_true[-1]["reflex"] > 0.5 if sim_state.history_true else False,
                "collapse_status": False,
                "context_radius": 1.0,
                "primary_fovea": [0,0],
                "secondary_fovea": [0,0],
                "focus_separation": 0.0,
                "drone_real_pos": sim_state.drone_pos.tolist(),
                "reflex_energy": 1.0,
                "wind_angle": float(sim_state.wind_angle),
                "wind_speed": float(sim_state.wind_speed),
                "rain_active": sim_state.rain_enabled,
                "weather_sunny": sim_state.weather_sunny,
            }
        else:
            sim_state.status = "SEARCHING"
            sim_state.generator.is_active = False
            sim_state.drone_pos = np.array([0.0, 0.0, 2.5]) 

    # Step Physics
    true_pos, target_vel, sonar_active, reflex_energy, levy_activity = sim_state.generator.update(drone_pos=sim_state.drone_pos[:2])
    noisy_pos = add_noise(true_pos)

    # 🦇 BAT RANGING: adapt IBIP alpha to current drone-target distance
    _bat_dist = float(np.linalg.norm(true_pos - sim_state.drone_pos[:2]))
    sim_state.ibip.adapt_to_distance(_bat_dist)

    # 2️⃣ IBIP: Intent Prediction
    predicted, target_vel, target_accel = sim_state.ibip.update_and_predict(noisy_pos)
    predicted = np.array(predicted)
    target_vel = np.array(target_vel)
    target_accel = np.array(target_accel)
    
    ibip_vel_magnitude = float(np.linalg.norm(target_vel)) 
    precision = compute_precision(true_pos, predicted)
    
    # 4️⃣ SDPL: Depth Anomaly
    depth_anomaly = sim_state.sdpl.evaluate_depth_anomaly(noisy_pos)

    # 🦗 LGMD: Looming reflex — target closing fast fires early warning
    _lgmd_dist = float(np.linalg.norm(true_pos - sim_state.drone_pos[:2]))
    looming_rate, is_looming = sim_state.lgmd.evaluate(_lgmd_dist, ref_size=1.0)

    # 3️⃣ ACCE: Confidence
    vel_variance = ibip_vel_magnitude * 0.1
    prediction_error = np.linalg.norm(true_pos - predicted)

    # Do not instantly collapse on the very first frame before velocity is established
    if not sim_state.history_true:
        confidence = 1.0
        is_collapsed = False
        visual_stability = 1.0
        sim_state.acce.confidence_score = 1.0
        sim_state.acce.is_collapsed = False
    else:
        confidence, is_collapsed, visual_stability = sim_state.acce.evaluate(
            prediction_error=prediction_error,
            velocity_variance=vel_variance,
            depth_anomaly=depth_anomaly,
            looming_rate=looming_rate,
        )
    
    if is_collapsed:
        predicted = noisy_pos
        sim_state.ibip.reset()
        sim_state.lgmd.reset()
        
    # 1️⃣ DFAF: Fovea Selection
    primary_fovea, secondary_fovea, focus_separation, context_radius = sim_state.dfaf.select(
        predicted_pos=predicted,
        velocity=target_vel,
        acceleration=target_accel,
        base_radius=1.0
    )

    # Wind angle slow drift each tick (one full rotation ~3500 ticks ≈ 6 min)
    sim_state.wind_angle += 0.00018 * np.sin(sim_state.time_elapsed * 0.04)

    # Drone Pursuit Logic
    wind_vector = np.array([0.0, 0.0])

    if sim_state.generator.is_active:
         chase_target = noisy_pos if is_collapsed else predicted
         drone_pos = sim_state.drone_pos # [X, Z, Y]
         
         drone_xz = np.array([drone_pos[0], drone_pos[1]])
         dist_xz = np.linalg.norm(chase_target - drone_xz)
         dt = 0.1 
         
         # Phase 15: Sustained Lock-On Timer
         if is_collapsed:
             sim_state.lock_timer += dt
         else:
             sim_state.lock_timer = 0.0
             
         is_striking = sim_state.lock_timer >= 3.0
         
         if is_striking:
             drone_speed = 25.0 # Instant maximum velocity for impact
             target_altitude = 0.9 # Center of mass of the human target
             vert_speed = 0.8 # Near-instant pitch down to ram
             sim_state.status = "STRIKING"
         elif is_collapsed:
             drone_speed = 5.0 # Maintain cruise while acquiring hard lock
             target_altitude = 2.5 # Maintain hover height
             vert_speed = 0.1 
             sim_state.status = "COLLAPSED"
         else:
             drone_speed = 5.0 # Cruising pursuit (faster base speed)
             target_altitude = 2.5 # Hover height
             vert_speed = 0.1 # Smooth stabilization
             sim_state.status = "TRACKING"
         
         # Phase 17/18: Spatial Wind Fluid Dynamics
         sim_state.time_elapsed += dt
         
         if sim_state.wind_enabled:
             wind_vector = sim_state.get_spatial_wind(drone_xz[0], drone_xz[1], sim_state.time_elapsed)
         else:
             wind_vector = np.array([0.0, 0.0])
             
         if dist_xz > 0.01:
             if is_striking:
                 # 🦅 PEREGRINE LOG-SPIRAL DIVE: curved approach — harder to evade,
                 # keeps target in peripheral fovea longer. Spiral tightens as dist closes.
                 base_angle = np.arctan2(
                     chase_target[1] - drone_xz[1], chase_target[0] - drone_xz[0]
                 )
                 spiral_offset = np.radians(15.0) * min(1.0, dist_xz / 10.0)
                 spiral_angle = base_angle + spiral_offset
                 drone_dir = np.array([np.cos(spiral_angle), np.sin(spiral_angle)])
             else:
                 # 🐉 DRAGONFLY CBA INTERCEPTION: aim at where target WILL BE,
                 # not where it is now. 95% catch-rate in nature.
                 look_ahead = dist_xz / max(drone_speed, 0.1)
                 target_vel_2d = np.array([target_vel[0], target_vel[1]])
                 intercept_pt = chase_target + target_vel_2d * look_ahead
                 intercept_vec = intercept_pt - drone_xz
                 intercept_dist = np.linalg.norm(intercept_vec)
                 # Safety: only use intercept if it doesn't overshoot wildly
                 if intercept_dist > 0.01 and intercept_dist < dist_xz * 4.0:
                     drone_dir = intercept_vec / intercept_dist
                 else:
                     drone_dir = (chase_target - drone_xz) / dist_xz

             move_dist = min(drone_speed * dt, dist_xz)

             # Apply intended drone thrust AND environmental wind drift
             drone_xz += (drone_dir * move_dist) + (wind_vector * dt)

             # Phase 15: Terrain Forecasting (Look 2.0m ahead for smooth pitching)
             forecast_xz = drone_xz + drone_dir * 2.0
         else:
             # Even hovering, the drone drifts in the wind and must correct next frame
             drone_xz += (wind_vector * dt)
             forecast_xz = drone_xz
             
         # 3D Obstacle Avoidance: steer around obstacles drone can't fly over
         if not is_striking:
             _AVOID_R = 6.0
             for obs in sim_state.generator.obstacles:
                 ox, oy = obs[0], obs[1]
                 obs_top = sim_state.generator.get_height(ox, oy) + (obs[2] if len(obs) > 2 else 2.0)
                 if sim_state.drone_pos[2] > obs_top + 0.5:
                     continue  # drone altitude clears obstacle — fly over
                 diff = drone_xz - np.array([ox, oy])
                 dist = np.linalg.norm(diff)
                 if 0.01 < dist < _AVOID_R:
                     strength = (_AVOID_R - dist) / _AVOID_R
                     drone_xz += (diff / dist) * strength * 1.2 * dt

         # Rain buffeting: random force on drone XZ each tick
         if sim_state.rain_enabled:
             rain_noise = np.random.normal(0, 0.08, 2)
             drone_xz += rain_noise * dt

         current_ground = sim_state.generator.get_height(drone_xz[0], drone_xz[1])
         forecast_ground = sim_state.generator.get_height(forecast_xz[0], forecast_xz[1])
         
         # The target height considers upcoming hills for smooth fluid ascent
         tracking_ground_height = max(current_ground, forecast_ground)
         
         if is_striking:
             # If striking, aim directly at the human's exact current ground height + center of mass
             target_ground = sim_state.generator.get_height(chase_target[0], chase_target[1])
             target_y = target_ground + target_altitude
         else:
             target_y = tracking_ground_height + target_altitude
         
         # Smooth vertical movement
         y_error = target_y - drone_pos[2]
         drone_pos[2] += y_error * vert_speed
         
         # Phase 14: Strict Minimum Altitude Clamp
         # Prevent drone from dipping into hills when traveling fast over uneven terrain
         if not is_striking:
            # We strictly clamp against the *current* ground so it doesn't clip, 
            # while the *target_y* pulls it smoothly up over forecasted hills.
            drone_pos[2] = max(drone_pos[2], current_ground + target_altitude)
         
         drone_pos[0] = drone_xz[0]
         drone_pos[1] = drone_xz[1]
         
         # Tactical Interception Logic (Phase 7)
         # 1. Calculate 2D XZ distance (Ignore vertical altitude for capture check)
         true_target_xz = np.array([true_pos[0], true_pos[1]])
         dist_xz_true = np.linalg.norm(true_target_xz - drone_xz)
         
         # 2. Check Height (Drone must be below 4.5m to 'count' as a close pursuit)
         is_low_enough = sim_state.drone_pos[2] < (current_ground + 4.0)
         
         if dist_xz_true < 1.0 and is_low_enough:
             sim_state.engaging_ticks += 1
             sim_state.status = "ENGAGING"
         else:
             # Lose progress if too far
             sim_state.engaging_ticks = max(0, sim_state.engaging_ticks - 1)
         
         # 3. Interception Charge Completion (1.5 seconds of sustained proximity)
         if sim_state.engaging_ticks >= 15:
             sim_state.status = "DESTROYED"
             sim_state.destroyed_until = current_time + 5.0 
             sim_state.engaging_ticks = 0 # Reset
             
             sim_state.generator.reset() 
             sim_state.generator.position = np.random.uniform(-25, 25, 2)
             sim_state.generator.is_active = True
             
             sim_state.ibip.reset()
             sim_state.acce.reset()
             sim_state.sdpl.reset()
             sim_state.lgmd.reset()
             
             new_p = sim_state.generator.position
             new_h = sim_state.generator.get_height(new_p[0], new_p[1])
             sim_state.drone_pos = np.array([new_p[0], new_p[1], new_h + 2.5])
             sim_state.true_pos = new_p.copy()
             predicted = new_p.copy()

    sim_state.true_pos = true_pos
    sim_state.predicted_pos = predicted

    # ── HYBRID SWITCH FRAMEWORK LOGIC ──
    # User Request: Reflex activates ONLY when target is 100% fixed (confidence >= 0.99).
    # Otherwise, Brain (predictive) is active.
    target_100_percent_fixed = (confidence >= 0.99)
    
    # Preserve the dynamic variation of the target's movement energy
    # We add a tiny bit of sensory noise so even a stationary truck has minor visual neural activity
    dynamic_energy = float(ibip_vel_magnitude) + np.random.uniform(0.05, 0.15)
    
    if target_100_percent_fixed:
        # Reflex channels the active energy
        hybrid_reflex = dynamic_energy
        hybrid_brain = 0.0
    else:
        # Brain channels the predictive energy
        hybrid_reflex = 0.0
        hybrid_brain = dynamic_energy

    sim_state.history_true.append({
        "time":       len(sim_state.full_session_history),
        "reflex":     float(hybrid_reflex),
        "brain":      float(hybrid_brain),
        "confidence": float(confidence),
        "is_collapsed": bool(is_collapsed),
        "sdpl":       1.0 if depth_anomaly else 0.0,
        "error":      float(1.0 - precision)
    })
    
    # Phase 19: Permanent Ledger of Real Telemetry 
    sim_state.full_session_history.append({
        "tick": len(sim_state.full_session_history),
        "time_elapsed": float(sim_state.time_elapsed),
        "drone_x": float(sim_state.drone_pos[0]),
        "drone_y": float(sim_state.drone_pos[2]), # Altitude
        "drone_z": float(sim_state.drone_pos[1]),
        "target_x": float(true_pos[0]),
        "target_z": float(true_pos[1]),
        "wind_force_x": float(wind_vector[0]),
        "wind_force_z": float(wind_vector[1]),
        "is_collapsed_lock": bool(is_collapsed),
        "status": sim_state.status,
        "precision": float(precision)
    })

    if len(sim_state.history_true) > 50:
        sim_state.history_true.pop(0)

    return {
        "true_pos":        true_pos.tolist(),
        "predicted_pos":   predicted.tolist(),
        "history_true":    sim_state.history_true,
        "precision":       precision,
        "stability":       confidence,
        "destination":     [true_pos[0], true_pos[1], sim_state.generator.get_height(true_pos[0], true_pos[1])],
        "status":          sim_state.status,
        "obstacles":       [o.tolist() for o in sim_state.generator.obstacles],
        "sonar_active":    sonar_active,
        "collapse_status": bool(is_collapsed),
        "context_radius":  float(context_radius),
        "primary_fovea":   primary_fovea.tolist() if isinstance(primary_fovea, np.ndarray) else primary_fovea,
        "secondary_fovea": secondary_fovea.tolist() if isinstance(secondary_fovea, np.ndarray) else secondary_fovea,
        "focus_separation":float(focus_separation),
        "drone_real_pos":  sim_state.drone_pos.tolist(),
        "reflex_energy":   1.0 - confidence,
        "wind_angle":      float(sim_state.wind_angle),
        "wind_speed":      float(sim_state.wind_speed),
        "rain_active":     sim_state.rain_enabled,
        "weather_sunny":   sim_state.weather_sunny,
    }

@app.post("/simulation/target")
def set_target(target: TargetRequest):
    sim_state.generator.teleport(target.x, target.y)
    sim_state.generator.is_active = True
    sim_state.drone_pos = np.array([0.0, 0.0, 2.5])
    sim_state.status = "TRACKING"
    return {"message": "Target set", "destination": [target.x, target.y]}

@app.post("/simulation/target/mode")
def set_target_mode(req: TargetModeRequest):
    if req.mode == 'truck':
        sim_state.generator.is_stationary = True
    else:
        sim_state.generator.is_stationary = False
    return {"message": f"Target mode set to {req.mode}", "mode": req.mode}

@app.post("/simulation/obstacles/add")
def add_obstacle(obs: ObstacleRequest):
    sim_state.generator.add_obstacle(obs.x, obs.y, obs.h)
    return {"message": "Obstacle added", "x": obs.x, "y": obs.y, "h": obs.h}

@app.post("/simulation/obstacles/clear")
def clear_obstacles():
    sim_state.generator.clear_obstacles()
    return {"message": "Obstacles cleared"}

@app.post("/simulation/scenario/forest")
def set_forest_scenario():
    sim_state.generator.generate_forest(40)
    return {"message": "Forest Scenario Loaded"}

@app.post("/simulation/scenario/urban")
def set_urban_scenario():
    sim_state.generator.generate_urban(40)
    return {"message": "Urban Scenario Loaded"}

@app.post("/simulation/scenario/mixed")
def set_mixed_scenario():
    sim_state.generator.generate_mixed(60)
    return {"message": "Mixed Scenario Loaded"}

@app.get("/simulation/telemetry/export")
def export_telemetry():
    """Returns the true, exact physical history of the drone's flight for RL analysis"""
    return {"telemetry": sim_state.full_session_history}

@app.post("/simulation/reset")
def reset_simulation():
    global sim_state
    sim_state = SimulationState()
    return {"message": "Simulation reset"}

@app.post("/simulation/wind/toggle")
def toggle_wind():
    sim_state.wind_enabled = not sim_state.wind_enabled
    return {"message": "Wind toggled", "wind_enabled": sim_state.wind_enabled}

@app.post("/simulation/weather/rain/toggle")
def toggle_rain():
    sim_state.rain_enabled = not sim_state.rain_enabled
    return {"rain_active": sim_state.rain_enabled}

@app.post("/simulation/weather/sunny/toggle")
def toggle_sunny():
    sim_state.weather_sunny = not sim_state.weather_sunny
    return {"weather_sunny": sim_state.weather_sunny}

# ---------------------------------------------------------
# Phase 21: RL Training & Model Download Endpoints
# ---------------------------------------------------------

rl_process = None

@app.post("/rl/train/start")
def start_rl_training():
    global rl_process
    
    # Check if already running by reading the status file
    status_file = "./backend/rl_training/rl_status.json"
    if os.path.exists(status_file):
        try:
            with open(status_file, "r") as f:
                status = json.load(f)
                if status.get("is_training", False):
                    raise HTTPException(status_code=400, detail="Training is already in progress.")
        except HTTPException:
            raise
        except (json.JSONDecodeError, OSError):
            pass
    
    # Write initial "Booting" status so UI instantly responds
    os.makedirs(os.path.dirname(status_file), exist_ok=True)
    with open(status_file, "w") as f:
        json.dump({
            "is_training": True,
            "current_epoch": 0,
            "total_epochs": 5,
            "message": "Booting dedicated RL OS Process...",
            "is_downloadable": False
        }, f)
    
    # OS-Level execution bypasses all Uvicorn/asyncio/multiprocessing thread locks
    log_file = open("./backend/rl_training/rl_stdout.log", "w")
    rl_process = subprocess.Popen(
        ["python", "-m", "backend.rl_training.train_coop"],
        stdout=log_file,
        stderr=subprocess.STDOUT
    )
    
    return {"message": "Training initiated in isolated OS process. Check rl_stdout.log for details."}

@app.get("/rl/train/status")
def get_rl_training_status():
    status_file = "./backend/rl_training/rl_status.json"
    if os.path.exists(status_file):
        try:
            with open(status_file, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
            
    # Fallback if file isn't created yet or is mid-write
    return {
        "is_training": False,
        "current_epoch": 0,
        "total_epochs": 5,
        "message": "Idle",
        "is_downloadable": os.path.exists("./backend/rl_training/models/drone_brain_cell_v1.zip")
    }

@app.get("/rl/model/download")
def download_rl_model():
    file_path = "./backend/rl_training/models/drone_brain_cell_v1.zip"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model file not found. Ensure training has completed.")
    return FileResponse(path=file_path, filename="drone_brain_cell_v1.zip", media_type="application/zip")


# ── Perception: YOLO-in-the-Loop ──────────────────────────────────────────────

class PerceptionRequest(BaseModel):
    image_b64: str
    img_w: int
    img_h: int
    cam_pos: list[float]   # [x, y, z] camera world position
    cam_quat: list[float]  # [x, y, z, w] Three.js quaternion
    fov_y: float           # vertical field of view in degrees

_yolo_detector = None

def _get_yolo():
    global _yolo_detector
    if _yolo_detector is None:
        from backend.perception.yolo_detector import YOLODetector
        _yolo_detector = YOLODetector()
    return _yolo_detector

@app.post("/perception/detect")
async def perception_detect(request: PerceptionRequest):
    try:
        detector = _get_yolo()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    image_bytes = base64.b64decode(request.image_b64)

    from backend.perception.yolo_detector import pixel_to_world
    raw = detector.detect(image_bytes)

    detections = []
    for det in raw:
        px, py = det["center_px"]
        world_pos = pixel_to_world(
            px, py,
            request.img_w, request.img_h,
            request.cam_pos, request.cam_quat,
            request.fov_y,
        )
        detections.append({**det, "world_pos": world_pos})

    return {"detections": detections, "count": len(detections)}

