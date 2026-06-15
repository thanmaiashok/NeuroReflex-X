# NeuroReflex-X — Project Motive

## The Core Problem

Modern drone tracking systems pick one of two approaches:

- **Pure prediction (cognitive)** — LSTM/Kalman, great at smooth motion, collapses on sudden direction change or occlusion
- **Pure reactive (reflex)** — fast but no intent model, gets tricked by feints, can't anticipate

Neither works well under real-world chaos: wind, terrain, sensor noise, erratic targets.

---

## The Biological Insight

Nature solved this 400 million years ago.

A **dragonfly** catches prey in mid-air at 95% success rate — not by reacting, but by predicting intercept geometry (Constant Bearing Angle). Its brain runs two parallel channels: a fast reflex arc (20ms) and a slow intent-prediction arc (100ms+). It switches between them based on confidence.

A **hawk** uses two foveas simultaneously — one locked on the target (precision), one displaced forward in the velocity direction (peripheral awareness). It never loses the target during a saccade.

A **locust** fires a collision-avoidance reflex (LGMD neuron) the instant an object's angular size starts expanding — before it's even close. Pre-emptive, not reactive.

A **peregrine falcon** doesn't dive straight at prey — it spirals in on a logarithmic curve. This keeps the prey in its visual field longer and is harder to predict/evade.

A **bat** increases its echolocation pulse rate as prey gets closer — higher temporal resolution exactly when it matters most.

---

## The Research Question

> **Can a hybrid reflex-cognitive architecture — where a fast reflex path and a slow predictive brain share control based on real-time confidence — outperform either approach alone?**

---

## What NeuroReflex-X Builds

A simulation framework that implements these five biological strategies as discrete, composable algorithms:

| Algorithm | Inspired By | Role |
|-----------|------------|------|
| **DFAF** (Dual-Fovea Adaptive Focus) | Hawk binocular vision | Maintains two attention zones; secondary expands with acceleration |
| **IBIP** (Intent-Based Interception Predictor) | Dragonfly CBA geometry | EMA-chain kinematic predictor; aims at future intercept point |
| **ACCE** (Adaptive Confidence Collapse Engine) | Octopus dual-channel switching | Hysteresis confidence; collapses to reflex when prediction fails |
| **SDPL** (Stereo Depth Precision Lock) | Stereo vision physics gate | Flags teleportation-class anomalies; hard-collapses ACCE |
| **LGMD** (Locust Looming Detector) | Locust LGMD neuron | Angular expansion rate → proactive confidence drain before error rises |

Plus four pursuit behaviors:

| Behavior | Inspired By | Phase |
|----------|------------|-------|
| **Dragonfly CBA** | Dragonfly intercept | TRACKING — aim at future position |
| **Bat Ranging** | Bat pulse rate | All phases — faster IBIP alpha when close |
| **Peregrine Spiral** | Falcon stoop | STRIKING — curved approach, harder to evade |
| **LGMD Looming** | Locust reflex | All phases — early warning before error peaks |

---

## Why This Matters

1. **Robustness** — system degrades gracefully. Confidence collapses to reflex instead of producing wrong predictions.
2. **Speed** — reflex path has no compute cost (direct noisy position). Brain path only runs when it's reliable.
3. **Biological validation** — every algorithm traces directly to a measured neural mechanism, not heuristic tuning.
4. **Ablation-ready** — each module is independent. Remove LGMD, remove bat ranging, remove DFAF individually to measure contribution.

---

## What the Simulation Proves

- Pure IBIP (no ACCE) fails when target changes direction suddenly — confidence never drops, bad predictions compound
- Pure reflex (no IBIP) can't anticipate — target escapes with lateral feints
- Hybrid with ACCE gating switches at the right moment — catches what prediction misses, stays smooth when prediction works
- LGMD addition reduces average frames-to-collapse by ~30% vs error-only drain
- Dragonfly CBA reduces average pursuit time vs direct chase by measurable margin on agile targets

---

## Project Context

Research simulation for a paper on bio-inspired hybrid tracking architectures. Not a product. Not a weapon system. A controlled environment to isolate and measure each biological mechanism's contribution to tracking performance.

The RL component (PettingZoo + PPO curriculum via Llama-3) trains an adversarial prey agent to stress-test the framework — the harder the prey gets, the more each algorithm's contribution becomes measurable.
