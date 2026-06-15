import numpy as np
from backend.simulation_engine.motion_generator import MotionGenerator
from backend.simulation_engine.noise_injector import add_noise
from backend.cognitive_core.ibip_predictor import IBIP
from backend.evaluation.precision_metrics import compute_precision


def run_ablation(reflex_on=True, brain_on=True, depth_on=True, frames=50):
    """
    Run mini-simulation with specified components enabled/disabled.
    brain_on=False  → reflex-only: raw noisy sensor used as prediction
    reflex_on=False → brain-only:  IBIP prediction with no reflex fallback
    depth_on        → informational (SDPL lives in main step pipeline)
    Returns real precision metrics over `frames` steps.
    """
    generator = MotionGenerator()
    ibip = IBIP() if brain_on else None
    scores = []

    for _ in range(frames):
        true_pos, _ = generator.update()
        noisy_pos = add_noise(np.array(true_pos))

        if brain_on and ibip is not None:
            pred_pos, _, _ = ibip.update_and_predict(noisy_pos)
            pred_pos = np.array(pred_pos)
        else:
            pred_pos = noisy_pos  # reflex-only: use raw sensor position

        scores.append(compute_precision(np.array(true_pos), pred_pos))

    scores = np.array(scores)
    return {
        "config": {"reflex": reflex_on, "brain": brain_on, "depth": depth_on},
        "avg_precision": float(np.mean(scores)),
        "min_precision": float(np.min(scores)),
        "max_precision": float(np.max(scores)),
        "std_precision": float(np.std(scores)),
        "frames": frames,
    }
