import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

plt.rcParams.update({'font.family': 'DejaVu Sans', 'figure.dpi': 180})

fig, ax = plt.subplots(figsize=(22, 16))
ax.set_xlim(0, 22)
ax.set_ylim(0, 16)
ax.axis('off')
fig.patch.set_facecolor('#0F172A')
ax.set_facecolor('#0F172A')

# ── Palette ──
C = {
    'input':    '#1E3A5F',
    'reflex':   '#7C2D12',
    'cognitive':'#14532D',
    'stab':     '#312E81',
    'meta':     '#713F12',
    'rl':       '#4A044E',
    'eval':     '#134E4A',
    'fail':     '#1C1917',
    'timing':   '#0C4A6E',
    'api':      '#1E1B4B',
    'frontend': '#042F2E',
    'baseline': '#27272A',
    'title_bg': '#1E293B',
    'border':   '#334155',
    'text':     '#F1F5F9',
    'sub':      '#94A3B8',
    'arrow':    '#64748B',
    'highlight':'#38BDF8',
}

def box(ax, x, y, w, h, label, sublabels, bg, border='#475569', fontsize=7.5, label_size=9):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle="round,pad=0.04",
                          facecolor=bg, edgecolor=border, linewidth=1.2, zorder=3)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h - 0.22, label,
            ha='center', va='top', fontsize=label_size, fontweight='bold',
            color=C['text'], zorder=4)
    for i, s in enumerate(sublabels):
        ax.text(x + w/2, y + h - 0.48 - i*0.21,
                f'· {s}', ha='center', va='top',
                fontsize=fontsize, color=C['sub'], zorder=4)

def arrow(ax, x1, y1, x2, y2, color='#38BDF8', lw=1.4, style='->'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color,
                                lw=lw, connectionstyle='arc3,rad=0.0'),
                zorder=5)

def darrow(ax, x1, y1, x2, y2, color='#38BDF8', lw=1.4):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='<->', color=color,
                                lw=lw, connectionstyle='arc3,rad=0.0'),
                zorder=5)

# ══════════════════════════════════════════════
#  TITLE
# ══════════════════════════════════════════════
title_rect = FancyBboxPatch((0.3, 14.9), 21.4, 0.85,
                             boxstyle="round,pad=0.05",
                             facecolor='#1E293B', edgecolor='#38BDF8', linewidth=2, zorder=3)
ax.add_patch(title_rect)
ax.text(11, 15.35, 'NeuroReflex-X — Full System Architecture',
        ha='center', va='center', fontsize=16, fontweight='bold',
        color='#38BDF8', zorder=4)

# ══════════════════════════════════════════════
#  ROW 1 — Inputs (top)
# ══════════════════════════════════════════════
# Simulation Engine
box(ax, 0.3, 12.6, 4.4, 2.1,
    'Simulation Engine',
    ['motion_generator', 'noise_injector', 'occlusion_manager',
     'multi_target_manager', 'target_variations', 'ground_truth_tracker'],
    C['input'], border='#3B82F6')

# Baselines
box(ax, 5.1, 12.6, 3.2, 2.1,
    'Baselines',
    ['kalman_tracker', 'sort_tracker', 'simple_lstm_tracker'],
    C['baseline'], border='#71717A')

# RL Training
box(ax, 8.7, 12.6, 3.5, 2.1,
    'RL Training (PPO)',
    ['predator_prey_env', 'train_coop', 'curriculum_director',
     'drone_brain_cell_v1 (model)'],
    C['rl'], border='#A855F7')

# Config
box(ax, 12.6, 12.6, 2.8, 2.1,
    'Config',
    ['system_config.yaml', 'simulation_config.yaml'],
    C['title_bg'], border='#475569')

# Frontend
box(ax, 15.8, 12.6, 5.9, 2.1,
    'Frontend — React/Vite',
    ['Dashboard · Scene3D · HUD', 'AlgoStatusPanel · MetricsPanel',
     'SimulationCanvas · CameraFeed', 'Map2D · ControlPanel · TerminalFeed',
     'OpticSensor · DroneConditionPanel'],
    C['frontend'], border='#10B981')

# ══════════════════════════════════════════════
#  ROW 2 — Core Processing Modules
# ══════════════════════════════════════════════
# DFAF — Reflex System
box(ax, 0.3, 9.5, 4.4, 2.8,
    'Reflex System  [DFAF]',
    ['dual_fovea_selector', 'lgmd_looming', 'motion_energy_tensor',
     'peripheral_event_field', 'reflex_stabilizer', 'reflex_trigger_logic'],
    C['reflex'], border='#EF4444', label_size=9.5)

# IBIP — Cognitive Core
box(ax, 5.1, 9.5, 3.5, 2.8,
    'Cognitive Core  [IBIP]',
    ['ibip_predictor', 'adaptive_predictor'],
    C['cognitive'], border='#22C55E', label_size=9.5)

# Cognitive System
box(ax, 9.0, 9.5, 4.0, 2.8,
    'Cognitive System',
    ['attention_fusion_engine', 'intent_lstm_predictor',
     'temporal_memory_bank', 'trajectory_optimizer', 'depth_lock_module'],
    C['cognitive'], border='#86EFAC', label_size=9.5)

# ACCE+SDPL — Stabilization
box(ax, 13.4, 9.5, 4.0, 2.8,
    'Stabilization Core  [ACCE+SDPL]',
    ['confidence_collapse', 'drift_suppression_engine',
     'lock_stability_calculator', 're_focus_manager'],
    C['stab'], border='#818CF8', label_size=9.5)

# Meta Adaptation
box(ax, 17.8, 9.5, 3.9, 2.8,
    'Meta Adaptation',
    ['adaptive_scheduler', 'dynamic_parameter_tuner',
     'threshold_optimizer'],
    C['meta'], border='#FCD34D', label_size=9.5)

# ══════════════════════════════════════════════
#  ROW 3 — Analysis & API
# ══════════════════════════════════════════════
# Evaluation
box(ax, 0.3, 6.0, 5.0, 3.1,
    'Evaluation Suite',
    ['acce_engine · sdpl_module', 'comparison_engine · ablation_study',
     'drift_analysis · stability_curve',
     'mota_motp_metrics · precision_metrics'],
    C['eval'], border='#14B8A6')

# Failure Analysis
box(ax, 5.7, 6.0, 4.2, 3.1,
    'Failure Analysis',
    ['drift_cause_classifier', 'failure_logger',
     'instability_mapper', 'recovery_analyzer'],
    C['fail'], border='#78716C')

# Timing Analysis
box(ax, 10.3, 6.0, 4.0, 3.1,
    'Timing Analysis',
    ['brain_latency_profiler', 'reflex_latency_profiler',
     'combined_response_analyzer'],
    C['timing'], border='#0EA5E9')

# API Layer
box(ax, 14.7, 6.0, 7.0, 3.1,
    'FastAPI Backend  (api.py · main.py · api_state.py)',
    ['REST endpoints — /track, /simulate, /status, /metrics',
     'WebSocket — real-time telemetry stream',
     'State management — api_state',
     'Orchestrates all backend modules'],
    C['api'], border='#6366F1')

# ══════════════════════════════════════════════
#  ROW 4 — Experiments
# ══════════════════════════════════════════════
box(ax, 0.3, 3.5, 21.4, 2.2,
    'Experiments',
    ['run_full_experiment.py  ·  ablation_runner.py  ·  baseline_comparison_runner.py  ·  stress_test_runner.py'],
    C['title_bg'], border='#475569')

# ══════════════════════════════════════════════
#  ROW 5 — Output
# ══════════════════════════════════════════════
box(ax, 0.3, 1.0, 21.4, 2.2,
    'Output',
    ['fig1_comparative_accuracy  ·  fig2_drift_behavior  ·  fig3_response_time',
     'fig4_mode_switching  ·  fig5_radar_performance  ·  architecture diagram'],
    '#0F2A1A', border='#10B981')

# ══════════════════════════════════════════════
#  ARROWS — data/signal flow
# ══════════════════════════════════════════════
# Simulation → Reflex
arrow(ax, 2.5, 12.6, 2.5, 12.3)

# Simulation → IBIP
arrow(ax, 3.0, 12.6, 6.5, 12.3)

# Baselines → Evaluation
arrow(ax, 6.7, 12.6, 3.0, 9.1)

# RL → Cognitive Core
arrow(ax, 10.4, 12.6, 7.0, 12.3)

# Config → API
arrow(ax, 14.0, 13.3, 18.2, 12.6)

# Frontend <-> API (bidirectional)
darrow(ax, 18.7, 12.6, 18.7, 9.1, color='#10B981', lw=1.6)

# Simulation Engine → Reflex (vertical)
arrow(ax, 2.5, 12.6, 2.5, 12.31)

# Reflex ↔ Cognitive Core
darrow(ax, 4.7, 10.9, 5.1, 10.9, color='#EF4444')

# IBIP ↔ Cognitive System
darrow(ax, 8.6, 10.9, 9.0, 10.9, color='#22C55E')

# Cognitive System ↔ Stabilization
darrow(ax, 13.0, 10.9, 13.4, 10.9, color='#818CF8')

# Stabilization ↔ Meta Adaptation
darrow(ax, 17.4, 10.9, 17.8, 10.9, color='#FCD34D')

# Reflex → Evaluation
arrow(ax, 2.5, 9.5, 2.5, 9.1, color='#14B8A6')

# Cognitive → Failure Analysis
arrow(ax, 7.0, 9.5, 7.8, 9.1, color='#78716C')

# Stabilization → Timing Analysis
arrow(ax, 15.4, 9.5, 12.3, 9.1, color='#0EA5E9')

# All → API
arrow(ax, 2.5, 6.0, 17.0, 9.1, color='#6366F1', lw=1.0)
arrow(ax, 7.8, 6.0, 17.5, 9.1, color='#6366F1', lw=1.0)
arrow(ax, 12.3, 6.0, 18.0, 9.1, color='#6366F1', lw=1.0)

# Evaluation → Experiments
arrow(ax, 2.8, 6.0, 2.8, 5.7, color='#475569')

# API → Experiments
arrow(ax, 18.2, 6.0, 10.0, 5.7, color='#475569')

# Experiments → Output
arrow(ax, 11.0, 3.5, 11.0, 3.2, color='#10B981')

# ══════════════════════════════════════════════
#  LEGEND
# ══════════════════════════════════════════════
legend_items = [
    (C['input'],    '#3B82F6', 'Simulation / Input'),
    (C['reflex'],   '#EF4444', 'Reflex System (DFAF)'),
    (C['cognitive'],'#22C55E', 'Cognitive Core (IBIP)'),
    (C['stab'],     '#818CF8', 'Stabilization (ACCE+SDPL)'),
    (C['meta'],     '#FCD34D', 'Meta Adaptation'),
    (C['rl'],       '#A855F7', 'RL Training'),
    (C['eval'],     '#14B8A6', 'Evaluation'),
    (C['timing'],   '#0EA5E9', 'Timing Analysis'),
    (C['api'],      '#6366F1', 'FastAPI Backend'),
    (C['frontend'], '#10B981', 'Frontend'),
]

for i, (bg, border, label) in enumerate(legend_items):
    lx = 0.35 + (i % 5) * 4.3
    ly = 0.45 if i >= 5 else 0.7
    r = FancyBboxPatch((lx, ly), 0.28, 0.18, boxstyle="round,pad=0.02",
                       facecolor=bg, edgecolor=border, linewidth=1.0, zorder=6)
    ax.add_patch(r)
    ax.text(lx + 0.35, ly + 0.09, label, va='center', fontsize=7.2,
            color=C['sub'], zorder=6)

plt.tight_layout(pad=0.2)
plt.savefig('D:/project/NeuroReflex-X/output/fig6_architecture.png',
            bbox_inches='tight', facecolor='#0F172A')
plt.close()
print("Architecture diagram saved.")
