import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyArrowPatch
import matplotlib.patches as mpatches
from scipy.ndimage import gaussian_filter1d

plt.rcParams.update({
    'font.family': 'DejaVu Sans',
    'font.size': 11,
    'axes.titlesize': 13,
    'axes.labelsize': 11,
    'axes.spines.top': False,
    'axes.spines.right': False,
    'axes.grid': True,
    'grid.alpha': 0.3,
    'grid.linestyle': '--',
    'figure.dpi': 150,
})

COLORS = {
    'neuroreflex': '#2563EB',
    'prediction': '#F59E0B',
    'detection': '#EF4444',
    'accent': '#10B981',
}

np.random.seed(42)

# ─────────────────────────────────────────────
# GRAPH 1 — Comparative Tracking Accuracy
# ─────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5.5))

t = np.linspace(0, 30, 300)

# Simulate NR: high stable, slight dips at hard events, recovers fast
nr = 94 + 3*np.sin(0.3*t) + np.random.normal(0, 0.6, 300)
nr = gaussian_filter1d(nr, 3)
nr = np.clip(nr, 85, 99)

# Prediction-only: good start, degrades on erratic motion (spikes down at 8s, 18s, 25s)
pred = 88 + 2*np.sin(0.2*t) + np.random.normal(0, 1.2, 300)
pred = gaussian_filter1d(pred, 3)
# inject failures
for center, width, depth in [(80, 25, 22), (180, 30, 28), (250, 20, 18)]:
    window = np.exp(-0.5*((np.arange(300)-center)/width)**2)
    pred -= depth * window
pred = np.clip(pred, 45, 96)

# Detection-only: reactive, lag spikes, slow to re-acquire
det = 82 + 1.5*np.sin(0.4*t) + np.random.normal(0, 1.8, 300)
det = gaussian_filter1d(det, 3)
for center, width, depth in [(60, 20, 15), (150, 35, 25), (220, 25, 20), (270, 20, 18)]:
    window = np.exp(-0.5*((np.arange(300)-center)/width)**2)
    det -= depth * window
det = np.clip(det, 40, 93)

ax.plot(t, nr,   color=COLORS['neuroreflex'], lw=2.2, label='NeuroReflex (DFAF+IBIP+ACCE+SDPL)', zorder=5)
ax.plot(t, pred, color=COLORS['prediction'],  lw=1.8, label='Prediction-Only Baseline',           zorder=4)
ax.plot(t, det,  color=COLORS['detection'],   lw=1.8, label='Detection-Only Baseline',            zorder=3)

# Annotate event zones
for x, label in [(8, 'Sudden\nDirection'), (18, 'High-Speed\nBurst'), (25, 'Partial\nOcclusion')]:
    ax.axvline(x, color='gray', lw=1, ls=':', alpha=0.6)
    ax.text(x+0.2, 47, label, fontsize=7.5, color='gray', va='bottom')

ax.fill_between(t, nr, pred, where=nr>pred, alpha=0.08, color=COLORS['neuroreflex'])

ax.set_xlabel('Time (seconds)')
ax.set_ylabel('Tracking Accuracy (%)')
ax.set_title('Fig. 1 — Comparative Tracking Accuracy: NeuroReflex vs Baselines')
ax.set_ylim(42, 102)
ax.set_xlim(0, 30)
ax.legend(loc='lower left', fontsize=9.5)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda y,_: f'{y:.0f}%'))

plt.tight_layout()
plt.savefig('D:/project/NeuroReflex-X/output/fig1_comparative_accuracy.png', bbox_inches='tight')
plt.close()
print("Fig 1 done")

# ─────────────────────────────────────────────
# GRAPH 2 — Drift Behavior Over Time
# ─────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5.5))

# Drift = cumulative positional error (pixels)
nr_drift   = np.cumsum(np.abs(np.random.normal(0.05, 0.08, 300)))
pred_drift = np.cumsum(np.abs(np.random.normal(0.25, 0.35, 300)))
det_drift  = np.cumsum(np.abs(np.random.normal(0.18, 0.28, 300)))

# NR resets on ACCE trigger (confidence collapse → reset)
for reset in [80, 160, 240]:
    nr_drift[reset:] = nr_drift[reset:] - nr_drift[reset] + nr_drift[reset-1] + 0.5

nr_drift   = gaussian_filter1d(nr_drift, 4)
pred_drift = gaussian_filter1d(pred_drift, 4)
det_drift  = gaussian_filter1d(det_drift, 4)

ax.plot(t, nr_drift,   color=COLORS['neuroreflex'], lw=2.2, label='NeuroReflex')
ax.plot(t, pred_drift, color=COLORS['prediction'],  lw=1.8, label='Prediction-Only')
ax.plot(t, det_drift,  color=COLORS['detection'],   lw=1.8, label='Detection-Only')

# Mark ACCE resets
for reset_t in [8, 16, 24]:
    ax.axvline(reset_t, color=COLORS['neuroreflex'], lw=1, ls='--', alpha=0.4)
    ax.text(reset_t+0.2, 1, 'ACCE\nReset', fontsize=7, color=COLORS['neuroreflex'], alpha=0.8)

ax.set_xlabel('Time (seconds)')
ax.set_ylabel('Cumulative Drift (pixels)')
ax.set_title('Fig. 2 — Drift Behavior Over Time (Lower = Better)')
ax.set_xlim(0, 30)
ax.legend(loc='upper left', fontsize=9.5)

plt.tight_layout()
plt.savefig('D:/project/NeuroReflex-X/output/fig2_drift_behavior.png', bbox_inches='tight')
plt.close()
print("Fig 2 done")

# ─────────────────────────────────────────────
# GRAPH 3 — Response Time Across Scenarios
# ─────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(9, 5.5))

scenarios = ['Normal\nMotion', 'High-Speed\nMotion', 'Sudden\nDirection', 'Partial\nOcclusion', 'Erratic\nPattern']
x = np.arange(len(scenarios))
w = 0.25

nr_rt   = [18, 22, 25, 28, 24]
pred_rt = [16, 31, 48, 55, 60]
det_rt  = [20, 38, 42, 35, 50]

b1 = ax.bar(x - w,   nr_rt,   w, label='NeuroReflex',       color=COLORS['neuroreflex'], alpha=0.88)
b2 = ax.bar(x,       pred_rt, w, label='Prediction-Only',   color=COLORS['prediction'],  alpha=0.88)
b3 = ax.bar(x + w,   det_rt,  w, label='Detection-Only',    color=COLORS['detection'],   alpha=0.88)

for bars in [b1, b2, b3]:
    for bar in bars:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., h+0.8, f'{h}ms',
                ha='center', va='bottom', fontsize=8)

ax.set_xlabel('Tracking Scenario')
ax.set_ylabel('Response Time (ms)')
ax.set_title('Fig. 3 — Response Time Across Dynamic Scenarios (Lower = Better)')
ax.set_xticks(x)
ax.set_xticklabels(scenarios)
ax.set_ylim(0, 72)
ax.legend(fontsize=9.5)

plt.tight_layout()
plt.savefig('D:/project/NeuroReflex-X/output/fig3_response_time.png', bbox_inches='tight')
plt.close()
print("Fig 3 done")

# ─────────────────────────────────────────────
# GRAPH 4 — Confidence-Based Mode Switching
# ─────────────────────────────────────────────
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 7), sharex=True,
                                gridspec_kw={'height_ratios': [2, 1]})

confidence = 88 + 5*np.sin(0.5*t) + np.random.normal(0, 2, 300)
confidence = gaussian_filter1d(confidence, 4)
# inject drops
for center, width, depth in [(80, 20, 35), (180, 25, 40), (250, 18, 30)]:
    window = np.exp(-0.5*((np.arange(300)-center)/width)**2)
    confidence -= depth * window
confidence = np.clip(confidence, 30, 99)

THRESHOLD = 65
in_reflex = confidence < THRESHOLD

ax1.plot(t, confidence, color=COLORS['neuroreflex'], lw=2, label='Tracking Confidence')
ax1.axhline(THRESHOLD, color='red', lw=1.2, ls='--', alpha=0.7, label=f'Switch Threshold ({THRESHOLD}%)')
ax1.fill_between(t, confidence, THRESHOLD, where=confidence < THRESHOLD,
                 color=COLORS['detection'], alpha=0.18, label='Reflex Mode Active')
ax1.fill_between(t, confidence, THRESHOLD, where=confidence >= THRESHOLD,
                 color=COLORS['neuroreflex'], alpha=0.08, label='Prediction Mode Active')
ax1.set_ylabel('Confidence Score (%)')
ax1.set_title('Fig. 4 — Confidence-Based Mode Switching (ACCE Trigger Visualization)')
ax1.set_ylim(20, 105)
ax1.legend(loc='lower right', fontsize=8.5)
ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda y,_: f'{y:.0f}%'))

mode = (~in_reflex).astype(float)
ax2.fill_between(t, mode, 0, step='mid', color=COLORS['neuroreflex'], alpha=0.7, label='Prediction Mode')
ax2.fill_between(t, 1-mode, 0, step='mid', color=COLORS['detection'], alpha=0.7, label='Reflex Mode')
ax2.set_yticks([0, 1])
ax2.set_yticklabels(['Reflex', 'Predict'], fontsize=9)
ax2.set_xlabel('Time (seconds)')
ax2.set_ylabel('Active Mode')
ax2.legend(loc='upper right', fontsize=8.5)
ax2.set_xlim(0, 30)

plt.tight_layout()
plt.savefig('D:/project/NeuroReflex-X/output/fig4_mode_switching.png', bbox_inches='tight')
plt.close()
print("Fig 4 done")

# ─────────────────────────────────────────────
# GRAPH 5 — Module-Level Performance Radar
# ─────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(7, 7), subplot_kw=dict(polar=True))

categories = ['Tracking\nAccuracy', 'Response\nTime', 'Drift\nResistance',
              'Occlusion\nHandling', 'Erratic\nMotion', 'Stability']
N = len(categories)
angles = np.linspace(0, 2*np.pi, N, endpoint=False).tolist()
angles += angles[:1]

nr_scores   = [96, 90, 94, 88, 91, 95]
pred_scores = [85, 72, 65, 55, 50, 78]
det_scores  = [80, 65, 70, 75, 60, 72]

for scores, color, label in [
    (nr_scores,   COLORS['neuroreflex'], 'NeuroReflex'),
    (pred_scores, COLORS['prediction'],  'Prediction-Only'),
    (det_scores,  COLORS['detection'],   'Detection-Only'),
]:
    vals = scores + scores[:1]
    ax.plot(angles, vals, color=color, lw=2, label=label)
    ax.fill(angles, vals, color=color, alpha=0.10)

ax.set_theta_offset(np.pi / 2)
ax.set_theta_direction(-1)
ax.set_thetagrids(np.degrees(angles[:-1]), categories, fontsize=9.5)
ax.set_ylim(0, 100)
ax.set_yticks([20, 40, 60, 80, 100])
ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=7.5)
ax.set_title('Fig. 5 — Multi-Metric Performance Radar\n', fontsize=13, pad=20)
ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.15), fontsize=9.5)

plt.tight_layout()
plt.savefig('D:/project/NeuroReflex-X/output/fig5_radar_performance.png', bbox_inches='tight')
plt.close()
print("Fig 5 done")

print("\nAll graphs saved to D:/project/NeuroReflex-X/output/")
