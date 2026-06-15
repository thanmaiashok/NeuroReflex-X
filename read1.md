# NeuroReflex-X — Project Understanding (read1.md)

## 1. Project Identity

**NeuroReflex-X** is a bio-inspired hybrid tracking and pursuit system built on four core algorithms. The entire framework revolves around these four pillars — everything else exists to support, feed, visualize, or train them.

---

## 2. The Four Hero Algorithms

These are the algorithms the system is built on. They form the complete tracking pipeline from prediction → validation → focus → stability gating.

### Algorithm 1 — IBIP: Intent-Based Interception Predictor

**Role:** Predicts future target trajectory using motion parameters (velocity and acceleration).

**Location:** `backend/cognitive_core/ibip_predictor.py`

**What it does:**
- Takes noisy target positions as input
- Applies multi-stage Exponential Moving Average (EMA) filtering across three levels: position → velocity → acceleration → final prediction
- Uses kinematic extrapolation: `predicted = ema_pos + ema_vel + 0.5 * ema_accel`
- Outputs: predicted position, EMA-filtered velocity vector, EMA-filtered acceleration vector

**Key innovation — Bat Ranging:**
- Adapts its EMA smoothing parameters based on drone-target distance
- Close range (<5m): high alpha (0.60 pos, 0.55 vel) — reactive, fast response
- Mid range (5-15m): linear interpolation between reactive and smooth
- Far range (>15m): low alpha (0.20 pos, 0.20 vel) — smooth, noise-resistant

**Why it matters:** Pure position extrapolation fails under sensor noise. IBIP's multi-stage EMA produces stable predictions that don't jitter, while bat-ranging ensures the system is reactive when the target is close and smooth when it's far.

---

### Algorithm 2 — ACCE: Adaptive Confidence Collapse Engine

**Role:** Monitors tracking stability and triggers system reset when prediction confidence decreases.

**Location:** `backend/evaluation/acce_engine.py`

**What it does:**
- Receives four inputs: prediction error, velocity variance, depth anomaly flag, looming rate
- Maintains a running confidence score (0.0 to 1.0)
- Tracks a 15-frame error history window to compute average error and jitter (standard deviation)
- Computes visual stability: `1.0 - (jitter * 3.0)`
- Applies hysteresis/inertial trust logic:
  - Stable zone (avg_error < 0.15, jitter < 0.05): fast recovery (+0.08/frame)
  - Moderate zone (avg_error < 0.25): slow recovery (+0.02/frame)
  - Unstable zone: drains confidence proportionally to error and instability
- Absolute collapse on SDPL depth anomaly (confidence → 0.0)
- Preemptive drain from LGMD looming rate

**Collapse logic:**
- Enters collapsed state when confidence drops below 0.25
- Must recover above 0.5 to re-engage brain (prevents flickering)
- When collapsed: prediction falls back to raw noisy position, IBIP and LGMD reset

**Why it matters:** This is the gating mechanism that decides whether the system trusts its prediction or falls back to reflex. The hysteresis design prevents the oscillation problem that plagues naive switching approaches.

---

### Algorithm 3 — SDPL: Stereo Depth Precision Lock Module

**Role:** Validates spatial and depth consistency to prevent false target locking.

**Location:** `backend/evaluation/sdpl_module.py`

**What it does:**
- Tracks previous target position
- Computes distance jump between consecutive frames
- If jump exceeds `max_phys_jump` (2.0m, the maximum physically possible movement in one tick): flags anomaly
- Returns boolean: `is_anomaly = distance_jump > max_phys_jump`

**Effect:** When an anomaly is detected, ACCE immediately collapses confidence to 0.0, forcing the system into reflex mode and resetting all predictive modules.

**Why it matters:** Prevents the tracker from following ghost targets, sensor glitches, or teleportation artifacts. It is the physics validator that ensures the system only tracks physically plausible motion.

---

### Algorithm 4 — DFAF: Dual-Fovea Adaptive Focus Algorithm

**Role:** Maintains primary target focus with secondary contextual awareness for stable tracking.

**Location:** `backend/reflex_system/dual_fovea_selector.py`

**What it does:**
- Inspired by hawk vision — maintains two simultaneous focus points
- **Primary Fovea:** tight precision lock on the IBIP predicted position
- **Secondary Fovea:** contextual awareness window displaced along the velocity direction
- Computes adaptive context radius: `base_radius + (accel_mag * 15.0)` — expands with sudden acceleration
- Computes focus separation: `1.0 + (vel_mag * 2.0)` — grows with target speed
- Outputs: primary fovea position, secondary fovea position, focus separation distance, context radius

**Behavior:**
- Fast/sudden motion: secondary fovea expands outward, separation grows → system maintains wide peripheral awareness
- Calm/steady motion: both foveas converge → tight precision lock

**Why it matters:** Single-point focus loses targets during evasive maneuvers. Dual fovea ensures the system always knows where the target is AND where it might go next.

---

## 3. How the Four Algorithms Work Together

The complete per-frame pipeline:

```
Noisy target position
    │
    ▼
┌─────────────────────────────────┐
│  IBIP                           │
│  Predicts: pos, vel, accel      │
│  (adapts smoothing by distance) │
└──────────────┬──────────────────┘
               │ predicted + vel + accel
               ▼
┌─────────────────────────────────┐
│  SDPL                           │
│  Checks: is this physically     │
│  possible?                      │
│  → If NO: trigger collapse      │
└──────────────┬──────────────────┘
               │ anomaly flag
               ▼
┌─────────────────────────────────┐
│  ACCE                           │
│  Evaluates: error, variance,    │
│  depth anomaly, looming rate    │
│  → Produces: confidence score   │
│  → If collapsed: fallback       │
└──────────────┬──────────────────┘
               │ predicted + vel + accel + confidence
               ▼
┌─────────────────────────────────┐
│  DFAF                           │
│  Computes: primary fovea,       │
│  secondary fovea, context radius│
│  → Guides drone pursuit focus   │
└─────────────────────────────────┘
```

The hybrid switch at the end: if ACCE confidence ≥ 0.99, the reflex pathway channels the energy. Otherwise, the brain (predictive) pathway is active. Reflex only activates when the target is 100% fixed.

---

## 4. Supporting Modules

These exist to feed data to the hero algorithms, measure their performance, or provide infrastructure.

### 4.1 Simulation Engine (`backend/simulation_engine/`)

Feeds ground truth data to the tracking pipeline:
- **MotionGenerator** — Generates target movement (wander, evasion, obstacle avoidance, panic behavior)
- **NoiseInjector** — Adds Gaussian sensor noise (σ=0.05)
- **Terrain System** — Deterministic height mapping (shared between backend and frontend)
- **Scenario Generation** — Forest, Urban, Mixed scenarios with obstacle types
- **Ray Casting** — 12-ray sonar obstacle detection

### 4.2 Reflex System — Supporting (`backend/reflex_system/`)

- **MotionEnergyTensor** — Computes frame-to-frame displacement (raw reflex signal)
- **PeripheralEventField** — Threshold-based event detector
- **LGMD Looming Detector** — Feeds looming rate into ACCE for preemptive confidence drain
- **ReflexStabilizer** — Simple noise smoothing (legacy)
- **ReflexTrigger** — Binary event flag (legacy)

### 4.3 Stabilization Core — Supporting (`backend/stabilization_core/`)

- **ConfidenceCollapse** — Simple threshold detector (legacy, superseded by ACCE)
- **DriftSuppressionEngine** — Error-based positional correction
- **LockStabilityCalculator** — Exponential stability scoring
- **ReFocusManager** — Reset trigger flag

### 4.4 Evaluation — Supporting (`backend/evaluation/`)

- **PrecisionMetrics** — Normalized precision scoring (0-1)
- **MOTA/MOTP** — Multi-object tracking metrics
- **AblationStudy** — Module on/off configuration
- **DriftAnalysis** — Trajectory drift computation
- **StabilityCurve** — Confidence history recording
- **ComparisonEngine** — Model comparison utility

### 4.5 Meta-Adaptation (`backend/meta_adaptation/`)

- **AdaptiveScheduler** — Brain/reflex execution intervals
- **DynamicParameterTuner** — Error-based smoothing adjustment
- **ThresholdOptimizer** — Self-adjusting confidence thresholds

### 4.6 Failure Analysis (`backend/failure_analysis/`)

- **DriftCauseClassifier** — Classifies failure type
- **FailureLogger** — Logs failure events
- **InstabilityMapper** — Confidence variance mapping
- **RecoveryAnalyzer** — Recovery time computation

### 4.7 Timing Analysis (`backend/timing_analysis/`)

- **BrainLatencyProfiler** — Brain pathway timing
- **ReflexLatencyProfiler** — Reflex pathway timing
- **CombinedResponseAnalyzer** — Dominant system determination

### 4.8 RL Training (`backend/rl_training/`)

- **PredatorPreyEnv** — PettingZoo environment for co-evolution training
- **train_coop** — PPO training pipeline
- **CurriculumDirector** — Groq/LLama 3 LLM-based scenario generation
- Trained model: `drone_brain_cell_v1.zip`

### 4.9 Baselines (`backend/baselines/`)

- **KalmanTracker** — Kalman filter baseline
- **SortTracker** — Naive last-position tracker
- **SimpleLSTMTracker** — PyTorch LSTM baseline

### 4.10 Cognitive System — Experimental (`backend/cognitive_system/`)

- **IntentLSTMPredictor** — LSTM-based predictor (experimental)
- **TemporalMemoryBank** — State sequence storage
- **AttentionFusionEngine** — Reflex/brain position fusion
- **DepthLockModule** — Pseudo-depth computation
- **TrajectoryOptimizer** — Prediction smoothing

---

## 5. API & State Management

### 5.1 API State (`backend/api_state.py`)

Global `SimulationState` singleton that instantiates and holds the four hero algorithms:
```
self.ibip = IBIP(history_size=10)
self.sdpl = SDPL(max_phys_jump=2.0)
self.acce = ACCE(collapse_threshold=0.25)
self.dfaf = DualFoveaSelector(base_context=1.0, max_context=4.0)
self.lgmd = LGMDLoomingDetector(threshold=0.25, alpha=0.35)
```

### 5.2 API (`backend/api.py`)

FastAPI server. The `/simulation/step` endpoint orchestrates the four-algorithm pipeline:
1. Physics step → noisy position
2. IBIP → prediction, velocity, acceleration
3. SDPL → depth anomaly check
4. LGMD → looming rate
5. ACCE → confidence evaluation, collapse decision
6. DFAF → fovea selection
7. Drone pursuit → spiral/CBA, wind, obstacles
8. Interception → DESTROYED/respawn logic
9. Hybrid switch → reflex/brain energy allocation

---

## 6. Frontend

The frontend exists to visualize the four algorithms' outputs in real time:

| Panel | What it visualizes |
|-------|-------------------|
| **DeepAnalyticsPanel** | IBIP intent velocity, ACCE trust score, SDPL depth lock events, DFAF reflex energy |
| **Map2D** | DFAF primary/secondary fovea rings, prediction vector, target/drone trails |
| **OpticSensor** | DFAF crosshair overlay, fovea rings, confidence bar, bounding box |
| **HUD** | DFAF radius, precision, collapse status |
| **TerminalFeed** | IBIP velocity logs, ACCE collapse events, DFAF sonar events |
| **Scene3D** | 3D pursuit visualization driven by all four algorithms' outputs |
| **DroneConditionPanel** | Hardware telemetry derived from precision/stability |

---

## 7. Key Technologies

| Category | Technologies |
|----------|-------------|
| Backend | FastAPI, Uvicorn, NumPy, PyTorch |
| RL | Stable-Baselines3, PettingZoo, Supersuit |
| LLM | Groq API (Llama 3.3 70B) |
| Frontend | React 19, Vite 7 |
| 3D | Three.js, @react-three/fiber, @react-three/drei, @react-three/rapier |
| Charts | Recharts |

---

## 8. Configuration

- `.env` — GROQ_API_KEY for LLM curriculum director
- `backend/config/system_config.yaml` — Reflex threshold, brain interval, confidence threshold, smoothing alpha
- `backend/config/simulation_config.yaml` — Time step, noise level, occlusion probability

---

## 9. Experiments

- `run_full_experiment.py` — Precision evaluation
- `ablation_runner.py` — Hero algorithm on/off testing
- `baseline_comparison_runner.py` — Kalman filter comparison
- `stress_test_runner.py` — High-noise testing

---

## 10. Summary

NeuroReflex-X is built on four hero algorithms:

1. **IBIP** — predicts where the target will be
2. **SDPL** — validates whether the movement is physically possible
3. **ACCE** — decides whether to trust the prediction or fall back to reflex
4. **DFAF** — maintains focused tracking with contextual awareness

Everything else — the simulation engine, the RL training, the baselines, the frontend, the telemetry — exists to support, measure, visualize, or improve these four algorithms.
