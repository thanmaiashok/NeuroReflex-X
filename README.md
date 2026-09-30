# NeuroReflex-X

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python) ![Node](https://img.shields.io/badge/Node-18+-339933?logo=nodedotjs) ![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi) ![License](https://img.shields.io/badge/License-MIT-green)

**Hybrid Reflex-Cognitive Drone Pursuit Framework**

Bio-inspired autonomous drone tracking simulation. Fuses fast reflex pathways (hawk/locust/dragonfly neuroscience) with a slow cognitive prediction brain. Built for research — demonstrates how hybrid neural architectures outperform pure-prediction or pure-reactive trackers.

---

## Quick Start

Run from CMD (not PowerShell):

```bat
start.bat
```

Opens:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

Stop everything:

```bat
kill.bat
```

### Requirements

- Python 3.10+
- Node.js 18+
- `GROQ_API_KEY` env var (only needed for RL curriculum training)

```bat
set GROQ_API_KEY=your_key_here
```

---

## Project Structure

```
NeuroReflex-X/
├── backend/                   # FastAPI simulation engine
│   ├── api.py                 # REST API endpoints + main simulation loop
│   ├── api_state.py           # Global SimulationState singleton
│   ├── cognitive_core/
│   │   ├── ibip_predictor.py  # IBIP: EMA-based trajectory prediction
│   │   └── adaptive_predictor.py
│   ├── reflex_system/
│   │   ├── dual_fovea_selector.py  # DFAF: hawk dual-fovea focus
│   │   ├── lgmd_looming.py         # LGMD: locust looming detector
│   │   ├── motion_energy_tensor.py
│   │   ├── peripheral_event_field.py
│   │   ├── reflex_trigger_logic.py
│   │   └── reflex_stabilizer.py
│   ├── evaluation/
│   │   ├── acce_engine.py     # ACCE: confidence collapse engine
│   │   ├── sdpl_module.py     # SDPL: stereo depth anomaly detector
│   │   ├── precision_metrics.py
│   │   ├── mota_motp_metrics.py
│   │   ├── drift_analysis.py
│   │   ├── stability_curve.py
│   │   ├── ablation_study.py
│   │   └── comparison_engine.py
│   ├── simulation_engine/
│   │   ├── motion_generator.py     # Target physics + terrain + obstacles
│   │   ├── noise_injector.py
│   │   ├── occlusion_manager.py
│   │   ├── target_variations.py
│   │   ├── multi_target_manager.py
│   │   └── ground_truth_tracker.py
│   ├── stabilization_core/
│   │   ├── confidence_collapse.py
│   │   ├── lock_stability_calculator.py
│   │   ├── drift_suppression_engine.py
│   │   └── re_focus_manager.py
│   ├── meta_adaptation/
│   │   ├── threshold_optimizer.py
│   │   ├── adaptive_scheduler.py
│   │   └── dynamic_parameter_tuner.py
│   ├── timing_analysis/
│   │   ├── brain_latency_profiler.py
│   │   ├── reflex_latency_profiler.py
│   │   └── combined_response_analyzer.py
│   ├── failure_analysis/
│   │   ├── failure_logger.py
│   │   ├── recovery_analyzer.py
│   │   ├── instability_mapper.py
│   │   └── drift_cause_classifier.py
│   ├── baselines/
│   │   ├── kalman_tracker.py
│   │   ├── sort_tracker.py
│   │   └── simple_lstm_tracker.py
│   └── rl_training/
│       ├── predator_prey_env.py    # PettingZoo multi-agent env
│       ├── train_coop.py           # SB3 PPO training script
│       ├── curriculum_director.py  # LLM-generated curriculum (Groq/Llama-3)
│       └── models/                 # Saved RL weights (after training)
│
├── frontend/                  # React 19 dashboard
│   └── src/
│       ├── Dashboard.jsx      # Main layout: sidebar, header, page routing
│       ├── ControlPanel.jsx   # Scenario controls + RL training trigger
│       ├── Map2D.jsx          # Canvas 2D bird's-eye map
│       ├── OpticSensor.jsx    # Three.js drone-gimbal camera view
│       ├── DeepAnalyticsPanel.jsx  # Recharts analytics strip
│       ├── HUD.jsx            # Live telemetry overlay
│       ├── Scene3D.jsx        # 3D environment view
│       ├── MetricsPanel.jsx   # Algorithm metric cards
│       ├── AlgoStatusPanel.jsx
│       ├── TerminalFeed.jsx   # Log feed
│       ├── CameraFeed.jsx
│       └── index.css          # Design token system
│
├── experiments/               # Offline evaluation runners
│   ├── run_full_experiment.py
│   ├── ablation_runner.py
│   ├── stress_test_runner.py
│   └── baseline_comparison_runner.py
│
├── start.bat                  # Launch backend + frontend
└── kill.bat                   # Kill all services
```

---

## Core Algorithms

### 1. DFAF — Dual-Fovea Adaptive Focus

`backend/reflex_system/dual_fovea_selector.py`

Inspired by hawk binocular vision. Maintains two simultaneous attention zones:

- **Primary fovea** — precision lock on IBIP predicted position
- **Secondary fovea** — context window displaced along velocity direction

When motion accelerates, secondary fovea expands outward (peripheral awareness). When calm, both converge for tight lock. The separation metric drives the UI fovea rings.

```
adaptive_context = base_radius + (accel_mag * 15.0)
secondary = primary + vel_direction * (1.0 + vel_mag * 2.0)
```

### 2. IBIP — Intent-Based Interception Predictor

`backend/cognitive_core/ibip_predictor.py`

EMA-chain kinematic predictor. Six filtering stages:

1. EMA on raw noisy input positions (sensor noise removal)
2. Velocity from EMA positions (lower noise baseline)
3. EMA on velocity (damps motion jitter)
4. Acceleration clamped ±0.3 (spike suppression)
5. EMA on acceleration (dragonfly-style intent trend)
6. EMA on final prediction output (last-mile smoothing)

**Bat Ranging extension** — alpha dynamically adapts to distance:

| Distance | pos_alpha | vel_alpha | Behavior |
|----------|-----------|-----------|----------|
| < 5m     | 0.60      | 0.55      | Fast reaction (close quarters) |
| 5–15m    | linear interpolation | | Smooth transition |
| > 15m    | 0.20      | 0.20      | Smooth long-range tracking |

### 3. ACCE — Adaptive Confidence Collapse Engine

`backend/evaluation/acce_engine.py`

Hysteresis-based confidence system. Prevents flicker (doesn't collapse on every noise spike).

- Tracks rolling 15-frame error history
- Confidence drains only when avg_error > 0.4 OR drift spike > 0.3
- Fast recovery (+0.08/frame) when error < 0.15 and jitter < 0.05
- **LGMD early warning**: looming_rate drains confidence _before_ prediction error rises
- Collapse at threshold 0.25, requires recovery to 0.5 to re-engage brain

On collapse: IBIP resets, LGMD resets, system falls back to raw noisy position.

### 4. SDPL — Stereo Depth Precision Lock

`backend/evaluation/sdpl_module.py`

Physics-jump anomaly detector. If target moves more than `max_phys_jump=2.0m` in a single tick, flags as depth anomaly. ACCE immediately hard-collapses confidence to 0.0 on anomaly.

---

## Nature-Inspired Behavior Extensions

### Dragonfly CBA Interception

`backend/api.py` — TRACKING phase

Constant Bearing Angle geometry. Instead of chasing where target _is_, aims at where it _will be_ when drone arrives:

```python
look_ahead = dist_xz / drone_speed
intercept_pt = chase_target + target_vel * look_ahead
```

95% catch-rate in natural dragonflies. Prevents target escaping with lateral turns.

### Bat Ranging

`backend/cognitive_core/ibip_predictor.py — adapt_to_distance()`

Dynamic IBIP alpha based on proximity. Closer target = faster EMA response. Mimics bat echolocation pulse rate increase during closing approach.

### Peregrine Log-Spiral Dive

`backend/api.py` — STRIKING phase

Curved attack trajectory during final dive. Harder for target to evade than straight-line approach. Keeps target in peripheral fovea longer:

```python
spiral_offset = radians(15.0) * min(1.0, dist / 10.0)
spiral_angle  = direct_bearing + spiral_offset
```

Tightens as distance closes (offset shrinks toward 0 at impact).

### LGMD Looming Detector

`backend/reflex_system/lgmd_looming.py`

Locust Giant Movement Detector. Computes angular expansion rate of target:

```
angular_size = ref_size / dist       # small-angle approx
looming_rate = EMA(angular_size_delta)
```

Fires when rate > 0.25. Injects proactive confidence drain into ACCE _before_ prediction error rises — faster collapse trigger than error-based drain alone.

---

## Simulation Engine

`backend/simulation_engine/motion_generator.py`

**Target physics** — Reynolds-style steering:
- Wander force (smooth probabilistic heading changes)
- Separation force (obstacle avoidance via repulsion)
- Seek/flee force toward/from drone
- Mass=70kg, max_speed=2.5m/s, max_force=6.0N

**Terrain** — deterministic height map via overlapping sine waves:
```python
h = sin(x*0.15)*2.5 + cos(y*0.18)*1.5 + sin((x+y)*0.30)*0.5
```

**Scenarios**:
- Forest: 15 random cylindrical obstacles
- Urban: grid-snapped obstacles (40 count)
- Custom: add/clear via API

**Spatial wind** — 2D vector field approximating fluid dynamics:
```python
angle = sin(x*0.05 + t*0.5)*1.5 + cos(z*0.05 - t*0.3)*1.5
magnitude = 3.0 + sin(x*0.1 - t) + cos(z*0.1 + t*1.2)
```

---

## Drone Pursuit State Machine

```
SEARCHING → TRACKING → COLLAPSED → STRIKING → ENGAGING → DESTROYED → (respawn 5s) → SEARCHING
```

| State | Speed | Altitude | Behavior |
|-------|-------|----------|----------|
| SEARCHING | — | 2.5m | Waiting for target activation |
| TRACKING | 5m/s | 2.5m | Dragonfly CBA intercept |
| COLLAPSED | 5m/s | 2.5m | Noisy pos fallback, re-acquiring |
| STRIKING | 25m/s | target CoM | Peregrine log-spiral dive |
| ENGAGING | — | — | 1.5s proximity lock (15 ticks at <1m) |
| DESTROYED | — | — | 5s respawn timer, target relocates |

**Hybrid switch logic**: Reflex activates only when confidence ≥ 0.99 (target 100% fixed). Otherwise cognitive brain (IBIP predictor) is active.

---

## REST API

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/simulation/step` | Advance simulation one tick, get full state |
| POST | `/simulation/target` | Set target position `{x, y}` |
| POST | `/simulation/target/mode` | Set mode `{mode: "human"\|"truck"}` |
| POST | `/simulation/obstacles/add` | Add obstacle `{x, y}` |
| POST | `/simulation/obstacles/clear` | Clear all obstacles |
| POST | `/simulation/scenario/forest` | Load forest (15 obstacles) |
| POST | `/simulation/scenario/urban` | Load urban (40 obstacles) |
| POST | `/simulation/reset` | Full reset |
| POST | `/simulation/wind/toggle` | Toggle spatial wind on/off |
| GET | `/simulation/telemetry/export` | Export full flight history JSON |
| POST | `/rl/train/start` | Start RL training (isolated OS process) |
| GET | `/rl/train/status` | Get training progress |
| GET | `/rl/model/download` | Download trained model ZIP |

**Step response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `true_pos` | `[x, z]` | Ground truth target position |
| `predicted_pos` | `[x, z]` | IBIP prediction |
| `drone_real_pos` | `[x, z, alt]` | Drone 3D position |
| `destination` | `[x, z, terrain_h]` | Target + terrain height |
| `stability` | `float` | ACCE confidence 0–1 |
| `precision` | `float` | Prediction accuracy 0–1 |
| `collapse_status` | `bool` | ACCE collapsed flag |
| `primary_fovea` | `[x, z]` | DFAF primary focus |
| `secondary_fovea` | `[x, z]` | DFAF context focus |
| `focus_separation` | `float` | Distance between foveas |
| `context_radius` | `float` | Adaptive context window size |
| `reflex_energy` | `float` | 1 - confidence (reflex activation) |
| `sonar_active` | `bool` | Reflex > 0.5 threshold |
| `status` | `string` | SEARCHING/TRACKING/COLLAPSED/STRIKING/ENGAGING/DESTROYED |
| `obstacles` | `[[x,z], ...]` | Obstacle positions |
| `history_true` | `[{...}]` | Rolling 50-frame telemetry |

---

## Frontend

**Stack**: React 19, Vite, Three.js, @react-three/fiber, @react-three/drei, Recharts

**Design tokens** (`frontend/src/index.css`):

| Token | Value | Use |
|-------|-------|-----|
| `--bg-0` | `#0a0a0a` | Root background |
| `--bg-1` | `#111111` | Card/panel background |
| `--bg-2` | `#1a1a1a` | Elevated surface |
| `--bg-3` | `#242424` | Interactive hover |
| `--text-0` | `#f0f0f0` | Primary text |
| `--text-1` | `#a0a0a0` | Secondary text |
| `--text-2` | `#606060` | Muted/disabled |
| `--status-ok` | `#6fcf97` | Healthy / confident |
| `--status-warn` | `#f2c94c` | Warning / medium |
| `--status-strike` | `#bb86fc` | Striking phase |
| `--status-danger` | `#eb5757` | Danger / collapsed |
| `--status-info` | `#56ccf2` | Info / tracking |

**Components**:

| Component | Description |
|-----------|-------------|
| `Dashboard.jsx` | Main layout: sidebar nav, live clock, inline metrics |
| `ControlPanel.jsx` | Target/obstacle/scenario/wind/RL buttons |
| `Map2D.jsx` | Canvas 2D: drone + target trails, fovea rings, prediction vector, range rings, scale bar |
| `OpticSensor.jsx` | Three.js drone-mounted gimbal camera: follows real altitude, lerp smoothing, DFAF HUD overlays, confidence bar |
| `DeepAnalyticsPanel.jsx` | Recharts: reflex/brain/confidence/SDPL time series, PRECISION metric row |
| `HUD.jsx` | Live text telemetry: coordinates, precision, confidence, status |
| `Scene3D.jsx` | 3D environment: terrain, obstacles, target sphere |

---

## RL Training

`backend/rl_training/`

- **Environment**: PettingZoo parallel env — drone (predator) vs target (prey)
- **Algorithm**: PPO via Stable Baselines 3
- **Device**: CUDA if available, else CPU
- **Curriculum**: Groq Llama-3.3-70B generates scenario configs each epoch based on drone survival rate
- **Output**: `backend/rl_training/models/drone_brain_cell_v1.zip`
- **Logs**: `backend/rl_training/rl_stdout.log`
- **Status**: `backend/rl_training/rl_status.json` (polled by frontend)

Requires `GROQ_API_KEY` environment variable. Set before launching:

```bat
set GROQ_API_KEY=your_key_here
start.bat
```

---

## Evaluation & Baselines

`backend/evaluation/` — online metrics computed each tick:
- **MOTA/MOTP** (`mota_motp_metrics.py`) — standard MOT benchmark metrics
- **Precision** (`precision_metrics.py`) — normalized prediction accuracy
- **Drift analysis** (`drift_analysis.py`) — EMA error trend
- **Stability curve** (`stability_curve.py`) — confidence over time
- **Ablation study** (`ablation_study.py`) — component knockout comparisons

`backend/baselines/` — comparison trackers:
- Kalman Filter (`kalman_tracker.py`)
- SORT tracker (`sort_tracker.py`)
- Simple LSTM (`simple_lstm_tracker.py`)

`experiments/` — offline batch runners for paper-quality results:
- `run_full_experiment.py` — full pipeline
- `ablation_runner.py` — systematic component removal
- `stress_test_runner.py` — high wind/obstacle density
- `baseline_comparison_runner.py` — NRX vs baselines

---

## Architecture Overview

```
Sensor Input (noisy position)
        │
        ▼
    SDPL ──── physics anomaly? ──→ ACCE hard collapse
        │
        ▼
    IBIP ──── EMA kinematic prediction
     ├── adapt_to_distance() [Bat Ranging]
        │
        ▼
    DFAF ──── dual-fovea selection → UI rings
        │
        ▼
    ACCE ──── confidence evaluation
     ├── LGMD looming → early drain [Locust]
     └── hysteresis collapse/recovery
        │
        ▼
  Hybrid Switch ──── confidence ≥ 0.99?
     ├── YES → Reflex path (direct response)
     └── NO  → Brain path (IBIP prediction)
        │
        ▼
  Drone Pursuit
     ├── TRACKING  → Dragonfly CBA intercept
     └── STRIKING  → Peregrine log-spiral dive
```

---

## Known Constraints

- `start.bat` must run from CMD, not PowerShell (`start` command behaves differently)
- `web/` directory may still exist if VS Code locked it during restructure — safe to delete manually
- RL training requires `GROQ_API_KEY`; falls back to hardcoded difficulty config if API fails
- Map terrain is procedural (sine-wave), not loaded from file — deterministic per position
- Drone coordinate system: `[X, Z_world, Altitude]` — Y axis is vertical (Three.js convention)
