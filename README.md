<p align="center"><img src="docs/flow-3.svg" alt="Animated NeuroReflex-X pipeline: Perceive → Reflex → Predict → Fuse → Optimize → Evaluate" width="100%"/></p>

<p align="center"><sub>10-second tour: Perceive → Reflex → Predict → Fuse → Optimize → Evaluate</sub></p>

<p align="center"><img src="docs/px3/intro.svg" width="100%" alt="Bio-inspired autonomous drone tracking simulation. Fuses fast reflex pathways (hawk, locust, dragonfly neuroscience) with a slow cognitive prediction brain."/></p>

<p align="center"><img src="docs/px3/features.svg" width="100%" alt="Key features"/></p>

<a id="quick-start"></a>
<h2><img src="docs/px3/h2-quick-start.svg" width="100%" alt="Quick Start"/></h2>

<p align="center"><img src="docs/px3/t-01.svg" width="100%" alt="Run from CMD (not PowerShell):"/></p>

<p align="center"><img src="docs/px3/c-01.svg" width="100%" alt="code: start.bat "/></p>

<p align="center"><img src="docs/px3/t-02.svg" width="100%" alt="Opens: Frontend: http://localhost:5173 Backend API: http://localhost:8000 API Docs: http://localhost:8000/docs Stop everything:"/></p>

<p align="center"><img src="docs/px3/c-02.svg" width="100%" alt="code: kill.bat "/></p>

<a id="requirements"></a>
<h3><img src="docs/px3/h3-requirements.svg" width="100%" alt="Requirements"/></h3>

<p align="center"><img src="docs/px3/t-03.svg" width="100%" alt="Python 3.10+ Node.js 18+ GROQ_API_KEY env var (only needed for RL curriculum training)"/></p>

<p align="center"><img src="docs/px3/c-03.svg" width="100%" alt="code: set GROQ_API_KEY=your_key_here "/></p>

<a id="project-structure"></a>
<h2><img src="docs/px3/h2-project-structure.svg" width="100%" alt="Project Structure"/></h2>

<p align="center"><img src="docs/px3/c-04.svg" width="100%" alt="code: NeuroReflex-X/ ├── backend/ # FastAPI simulation engine │ ├── api.py # REST API endpoints + main simulation loop │ ├── api_state.py # Global SimulationState sin"/></p>

<a id="core-algorithms"></a>
<h2><img src="docs/px3/h2-core-algorithms.svg" width="100%" alt="Core Algorithms"/></h2>

<a id="1-dfaf--dual-fovea-adaptive-focus"></a>
<h3><img src="docs/px3/h3-1-dfaf-dual-fovea-adaptive-focus.svg" width="100%" alt="1. DFAF — Dual-Fovea Adaptive Focus"/></h3>

<p align="center"><img src="docs/px3/t-04.svg" width="100%" alt="backend/reflex_system/dual_fovea_selector.py Inspired by hawk binocular vision. Maintains two simultaneous attention zones: Primary fovea - precision lock on IBIP predicted position Secondary fovea - context window displaced along velocity direction When motion accelerates, secondary fovea expands outward (peripheral awareness). When calm, both converge for tight lock. The separation metric drives the UI fovea rings."/></p>

<p align="center"><img src="docs/px3/c-05.svg" width="100%" alt="code: adaptive_context = base_radius + (accel_mag * 15.0) secondary = primary + vel_direction * (1.0 + vel_mag * 2.0) "/></p>

<a id="2-ibip--intent-based-interception-predictor"></a>
<h3><img src="docs/px3/h3-2-ibip-intent-based-interception-predictor.svg" width="100%" alt="2. IBIP — Intent-Based Interception Predictor"/></h3>

<p align="center"><img src="docs/px3/t-05.svg" width="100%" alt="backend/cognitive_core/ibip_predictor.py EMA-chain kinematic predictor. Six filtering stages: EMA on raw noisy input positions (sensor noise removal) Velocity from EMA positions (lower noise baseline) EMA on velocity (damps motion jitter) Acceleration clamped 0.3 (spike suppression) EMA on acceleration (dragonfly-style intent trend) EMA on final prediction output (last-mile smoothing) Bat Ranging extension - alpha dynamically adapts to distance: Distance | pos_alpha | vel_alpha | Behavior &lt; 5m | 0.60 | 0.55 | Fast reaction (close quarters) 5-15m | linear interpolation | | Smooth transition &gt; 15m | 0.20 | 0.20 | Smooth long-range tracking"/></p>

<a id="3-acce--adaptive-confidence-collapse-engine"></a>
<h3><img src="docs/px3/h3-3-acce-adaptive-confidence-collapse-engine.svg" width="100%" alt="3. ACCE — Adaptive Confidence Collapse Engine"/></h3>

<p align="center"><img src="docs/px3/t-06.svg" width="100%" alt="backend/evaluation/acce_engine.py Hysteresis-based confidence system. Prevents flicker (doesn&#x27;t collapse on every noise spike). Tracks rolling 15-frame error history Confidence drains only when avg_error &gt; 0.4 OR drift spike &gt; 0.3 Fast recovery (+0.08/frame) when error &lt; 0.15 and jitter &lt; 0.05 LGMD early warning: looming_rate drains confidence before prediction error rises Collapse at threshold 0.25, requires recovery to 0.5 to re-engage brain On collapse: IBIP resets, LGMD resets, system falls back to raw noisy position."/></p>

<a id="4-sdpl--stereo-depth-precision-lock"></a>
<h3><img src="docs/px3/h3-4-sdpl-stereo-depth-precision-lock.svg" width="100%" alt="4. SDPL — Stereo Depth Precision Lock"/></h3>

<p align="center"><img src="docs/px3/t-07.svg" width="100%" alt="backend/evaluation/sdpl_module.py Physics-jump anomaly detector. If target moves more than max_phys_jump=2.0m in a single tick, flags as depth anomaly. ACCE immediately hard-collapses confidence to 0.0 on anomaly."/></p>

<a id="nature-inspired-behavior-extensions"></a>
<h2><img src="docs/px3/h2-nature-inspired-behavior-extensions.svg" width="100%" alt="Nature-Inspired Behavior Extensions"/></h2>

<a id="dragonfly-cba-interception"></a>
<h3><img src="docs/px3/h3-dragonfly-cba-interception.svg" width="100%" alt="Dragonfly CBA Interception"/></h3>

<p align="center"><img src="docs/px3/t-08.svg" width="100%" alt="backend/api.py - TRACKING phase Constant Bearing Angle geometry. Instead of chasing where target is, aims at where it will be when drone arrives:"/></p>

<p align="center"><img src="docs/px3/c-06.svg" width="100%" alt="code: look_ahead = dist_xz / drone_speed intercept_pt = chase_target + target_vel * look_ahead "/></p>

<p align="center"><img src="docs/px3/t-09.svg" width="100%" alt="95% catch-rate in natural dragonflies. Prevents target escaping with lateral turns."/></p>

<a id="bat-ranging"></a>
<h3><img src="docs/px3/h3-bat-ranging.svg" width="100%" alt="Bat Ranging"/></h3>

<p align="center"><img src="docs/px3/t-10.svg" width="100%" alt="backend/cognitive_core/ibip_predictor.py - adapt_to_distance() Dynamic IBIP alpha based on proximity. Closer target = faster EMA response. Mimics bat echolocation pulse rate increase during closing approach."/></p>

<a id="peregrine-log-spiral-dive"></a>
<h3><img src="docs/px3/h3-peregrine-log-spiral-dive.svg" width="100%" alt="Peregrine Log-Spiral Dive"/></h3>

<p align="center"><img src="docs/px3/t-11.svg" width="100%" alt="backend/api.py - STRIKING phase Curved attack trajectory during final dive. Harder for target to evade than straight-line approach. Keeps target in peripheral fovea longer:"/></p>

<p align="center"><img src="docs/px3/c-07.svg" width="100%" alt="code: spiral_offset = radians(15.0) * min(1.0, dist / 10.0) spiral_angle = direct_bearing + spiral_offset "/></p>

<p align="center"><img src="docs/px3/t-12.svg" width="100%" alt="Tightens as distance closes (offset shrinks toward 0 at impact)."/></p>

<a id="lgmd-looming-detector"></a>
<h3><img src="docs/px3/h3-lgmd-looming-detector.svg" width="100%" alt="LGMD Looming Detector"/></h3>

<p align="center"><img src="docs/px3/t-13.svg" width="100%" alt="backend/reflex_system/lgmd_looming.py Locust Giant Movement Detector. Computes angular expansion rate of target:"/></p>

<p align="center"><img src="docs/px3/c-08.svg" width="100%" alt="code: angular_size = ref_size / dist # small-angle approx looming_rate = EMA(angular_size_delta) "/></p>

<p align="center"><img src="docs/px3/t-14.svg" width="100%" alt="Fires when rate &gt; 0.25. Injects proactive confidence drain into ACCE before prediction error rises - faster collapse trigger than error-based drain alone."/></p>

<a id="simulation-engine"></a>
<h2><img src="docs/px3/h2-simulation-engine.svg" width="100%" alt="Simulation Engine"/></h2>

<p align="center"><img src="docs/px3/t-15.svg" width="100%" alt="backend/simulation_engine/motion_generator.py Target physics - Reynolds-style steering: Wander force (smooth probabilistic heading changes) Separation force (obstacle avoidance via repulsion) Seek/flee force toward/from drone Mass=70kg, max_speed=2.5m/s, max_force=6.0N Terrain - deterministic height map via overlapping sine waves:"/></p>

<p align="center"><img src="docs/px3/c-09.svg" width="100%" alt="code: h = sin(x*0.15)*2.5 + cos(y*0.18)*1.5 + sin((x+y)*0.30)*0.5 "/></p>

<p align="center"><img src="docs/px3/t-16.svg" width="100%" alt="Scenarios: Forest: 15 random cylindrical obstacles Urban: grid-snapped obstacles (40 count) Custom: add/clear via API Spatial wind - 2D vector field approximating fluid dynamics:"/></p>

<p align="center"><img src="docs/px3/c-10.svg" width="100%" alt="code: angle = sin(x*0.05 + t*0.5)*1.5 + cos(z*0.05 - t*0.3)*1.5 magnitude = 3.0 + sin(x*0.1 - t) + cos(z*0.1 + t*1.2) "/></p>

<a id="drone-pursuit-state-machine"></a>
<h2><img src="docs/px3/h2-drone-pursuit-state-machine.svg" width="100%" alt="Drone Pursuit State Machine"/></h2>

<p align="center"><img src="docs/px3/c-11.svg" width="100%" alt="code: SEARCHING → TRACKING → COLLAPSED → STRIKING → ENGAGING → DESTROYED → (respawn 5s) → SEARCHING "/></p>

<p align="center"><img src="docs/px3/t-17.svg" width="100%" alt="State | Speed | Altitude | Behavior SEARCHING | - | 2.5m | Waiting for target activation TRACKING | 5m/s | 2.5m | Dragonfly CBA intercept COLLAPSED | 5m/s | 2.5m | Noisy pos fallback, re-acquiring STRIKING | 25m/s | target CoM | Peregrine log-spiral dive ENGAGING | - | - | 1.5s proximity lock (15 ticks at &lt;1m) DESTROYED | - | - | 5s respawn timer, target relocates Hybrid switch logic: Reflex activates only when confidence &gt;= 0.99 (target 100% fixed). Otherwise cognitive brain (IBIP predictor) is active."/></p>

<a id="rest-api"></a>
<h2><img src="docs/px3/h2-rest-api.svg" width="100%" alt="REST API"/></h2>

<p align="center"><img src="docs/px3/t-18.svg" width="100%" alt="Base URL: http://localhost:8000 Method | Endpoint | Description POST | /simulation/step | Advance simulation one tick, get full state POST | /simulation/target | Set target position {x, y} POST | /simulation/target/mode | Set mode {mode: &quot;human&quot;|&quot;truck&quot;} POST | /simulation/obstacles/add | Add obstacle {x, y} POST | /simulation/obstacles/clear | Clear all obstacles POST | /simulation/scenario/forest | Load forest (15 obstacles) POST | /simulation/scenario/urban | Load urban (40 obstacles) POST | /simulation/reset | Full reset POST | /simulation/wind/toggle | Toggle spatial wind on/off GET | /simulation/telemetry/export | Export full flight history JSON POST | /rl/train/start | Start RL training (isolated OS process) GET | /rl/train/status | Get training progress GET | /rl/model/download | Download trained model ZIP Step response fields:"/></p>

<p align="center"><img src="docs/px3/t-19.svg" width="100%" alt="Field | Type | Description true_pos | [x, z] | Ground truth target position predicted_pos | [x, z] | IBIP prediction drone_real_pos | [x, z, alt] | Drone 3D position destination | [x, z, terrain_h] | Target + terrain height stability | float | ACCE confidence 0-1 precision | float | Prediction accuracy 0-1 collapse_status | bool | ACCE collapsed flag primary_fovea | [x, z] | DFAF primary focus secondary_fovea | [x, z] | DFAF context focus focus_separation | float | Distance between foveas context_radius | float | Adaptive context window size reflex_energy | float | 1 - confidence (reflex activation) sonar_active | bool | Reflex &gt; 0.5 threshold status | string | SEARCHING/TRACKING/COLLAPSED/STRIKING/ENGAGING/DESTROYED obstacles | [[x,z], ...] | Obstacle positions history_true | [{...}] | Rolling 50-frame telemetry"/></p>

<a id="frontend"></a>
<h2><img src="docs/px3/h2-frontend.svg" width="100%" alt="Frontend"/></h2>

<p align="center"><img src="docs/px3/t-20.svg" width="100%" alt="Stack: React 19, Vite, Three.js, @react-three/fiber, @react-three/drei, Recharts Design tokens (frontend/src/index.css): Token | Value | Use --bg-0 | #0a0a0a | Root background --bg-1 | #111111 | Card/panel background --bg-2 | #1a1a1a | Elevated surface --bg-3 | #242424 | Interactive hover --text-0 | #f0f0f0 | Primary text --text-1 | #a0a0a0 | Secondary text --text-2 | #606060 | Muted/disabled --status-ok | #6fcf97 | Healthy / confident --status-warn | #f2c94c | Warning / medium --status-strike | #bb86fc | Striking phase --status-danger | #eb5757 | Danger / collapsed --status-info | #56ccf2 | Info / tracking Components: Component | Description Dashboard.jsx | Main layout: sidebar nav, live clock, inline metrics ControlPanel.jsx | Target/obstacle/scenario/wind/RL buttons Map2D.jsx | Canvas 2D: drone + target trails, fovea rings, prediction vector, range rings, scale bar OpticSensor.jsx | Three.js drone-mounted gimbal camera: follows real altitude, lerp smoothing, DFAF HUD overlays, confidence bar DeepAnalyticsPanel.jsx | Recharts: reflex/brain/confidence/SDPL time series, PRECISION metric row HUD.jsx | Live text telemetry: coordinates, precision, confidence, status Scene3D.jsx | 3D e"/></p>

<a id="rl-training"></a>
<h2><img src="docs/px3/h2-rl-training.svg" width="100%" alt="RL Training"/></h2>

<p align="center"><img src="docs/px3/t-21.svg" width="100%" alt="backend/rl_training/ Environment: PettingZoo parallel env - drone (predator) vs target (prey) Algorithm: PPO via Stable Baselines 3 Device: CUDA if available, else CPU Curriculum: Groq Llama-3.3-70B generates scenario configs each epoch based on drone survival rate Output: backend/rl_training/models/drone_brain_cell_v1.zip Logs: backend/rl_training/rl_stdout.log Status: backend/rl_training/rl_status.json (polled by frontend) Requires GROQ_API_KEY environment variable. Set before launching:"/></p>

<p align="center"><img src="docs/px3/c-12.svg" width="100%" alt="code: set GROQ_API_KEY=your_key_here start.bat "/></p>

<a id="evaluation--baselines"></a>
<h2><img src="docs/px3/h2-evaluation-baselines.svg" width="100%" alt="Evaluation &amp; Baselines"/></h2>

<p align="center"><img src="docs/px3/t-22.svg" width="100%" alt="backend/evaluation/ - online metrics computed each tick: MOTA/MOTP (mota_motp_metrics.py) - standard MOT benchmark metrics Precision (precision_metrics.py) - normalized prediction accuracy Drift analysis (drift_analysis.py) - EMA error trend Stability curve (stability_curve.py) - confidence over time Ablation study (ablation_study.py) - component knockout comparisons backend/baselines/ - comparison trackers: Kalman Filter (kalman_tracker.py) SORT tracker (sort_tracker.py) Simple LSTM (simple_lstm_tracker.py) experiments/ - offline batch runners for paper-quality results: run_full_experiment.py - full pipeline ablation_runner.py - systematic component removal stress_test_runner.py - high wind/obstacle density baseline_comparison_runner.py - NRX vs baselines"/></p>

<a id="architecture-overview"></a>
<h2><img src="docs/px3/h2-architecture-overview.svg" width="100%" alt="Architecture Overview"/></h2>

<p align="center"><img src="docs/px3/c-13.svg" width="100%" alt="code: Sensor Input (noisy position) │ ▼ SDPL ──── physics anomaly? ──→ ACCE hard collapse │ ▼ IBIP ──── EMA kinematic prediction ├── adapt_to_distance() [Bat Ranging]"/></p>

<a id="known-constraints"></a>
<h2><img src="docs/px3/h2-known-constraints.svg" width="100%" alt="Known Constraints"/></h2>

<p align="center"><img src="docs/px3/t-23.svg" width="100%" alt="start.bat must run from CMD, not PowerShell (start command behaves differently) web/ directory may still exist if VS Code locked it during restructure - safe to delete manually RL training requires GROQ_API_KEY; falls back to hardcoded difficulty config if API fails Map terrain is procedural (sine-wave), not loaded from file - deterministic per position Drone coordinate system: [X, Z_world, Altitude] - Y axis is vertical (Three.js convention)"/></p>

<p align="center"><a href="https://github.com/thanmaiashok"><img src="docs/px3/footer.svg" width="100%" alt="Built by Thanmai A, founder of FoxynAI"/></a></p>
