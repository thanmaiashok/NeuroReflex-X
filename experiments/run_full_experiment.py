import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from backend.simulation_engine.motion_generator import MotionGenerator
from backend.simulation_engine.noise_injector import add_noise
from backend.cognitive_core.ibip_predictor import IBIP
from backend.evaluation.sdpl_module import SDPL
from backend.evaluation.acce_engine import ACCE
from backend.reflex_system.lgmd_looming import LGMDLoomingDetector
from backend.evaluation.precision_metrics import compute_precision


def run_experiment(frames=200):
    generator = MotionGenerator()
    ibip      = IBIP()
    sdpl      = SDPL()
    acce      = ACCE()
    lgmd      = LGMDLoomingDetector()

    precision_scores  = []
    confidence_scores = []
    collapse_count    = 0
    prev_collapsed    = False
    drone_pos         = np.zeros(2)  # static reference for LGMD distance calc

    for _ in range(frames):
        true_pos, _ = generator.update()
        noisy_pos   = add_noise(np.array(true_pos))

        # IBIP: predict next position from noisy sensor
        pred_pos, ema_vel, _ = ibip.update_and_predict(noisy_pos)

        # SDPL: detect physics-breaking jump
        depth_anomaly = sdpl.evaluate_depth_anomaly(noisy_pos)

        # LGMD: looming rate from drone-to-target distance
        dist = float(np.linalg.norm(np.array(true_pos) - drone_pos))
        looming_rate, _ = lgmd.evaluate(max(dist, 0.1))

        # ACCE: confidence gating
        prediction_error = float(np.linalg.norm(np.array(pred_pos) - np.array(true_pos)))
        vel_variance     = float(np.var(ema_vel)) if hasattr(ema_vel, '__len__') else 0.0
        confidence, is_collapsed, _ = acce.evaluate(
            prediction_error, vel_variance, depth_anomaly, looming_rate
        )

        if is_collapsed and not prev_collapsed:
            collapse_count += 1
        prev_collapsed = is_collapsed

        precision = compute_precision(np.array(true_pos), np.array(pred_pos))
        precision_scores.append(precision)
        confidence_scores.append(confidence)

    precision_scores  = np.array(precision_scores)
    confidence_scores = np.array(confidence_scores)

    print(f"{'='*42}")
    print(f"  NeuroReflex-X Full Pipeline Experiment")
    print(f"{'='*42}")
    print(f"  Frames          : {frames}")
    print(f"  Avg Precision   : {np.mean(precision_scores):.4f}  ({np.mean(precision_scores)*100:.1f}%)")
    print(f"  Min Precision   : {np.min(precision_scores):.4f}")
    print(f"  Max Precision   : {np.max(precision_scores):.4f}")
    print(f"  Std Precision   : {np.std(precision_scores):.4f}")
    print(f"  Avg Confidence  : {np.mean(confidence_scores):.4f}")
    print(f"  Collapse Events : {collapse_count}")
    print(f"{'='*42}")


if __name__ == "__main__":
    run_experiment()
