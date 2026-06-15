from backend.simulation_engine.motion_generator import MotionGenerator
from backend.simulation_engine.noise_injector import add_noise
from backend.reflex_system.motion_energy_tensor import compute_motion_energy
from backend.reflex_system.peripheral_event_field import PeripheralEventField
from backend.reflex_system.dual_fovea_selector import DualFoveaSelector
from backend.stabilization_core.lock_stability_calculator import compute_stability
from backend.evaluation.precision_metrics import compute_precision

import numpy as np

def main_loop(frames=200):
    generator = MotionGenerator()
    event_detector = PeripheralEventField()
    fovea_selector = DualFoveaSelector()

    prev_pos = np.array([0.0, 0.0])
    true_history = []
    pred_history = []

    for frame in range(frames):
        true_pos, _ = generator.update()
        noisy_pos = add_noise(true_pos)

        motion_energy = compute_motion_energy(prev_pos, noisy_pos)
        event = event_detector.detect_event(motion_energy)

        if event:
            primary, secondary = fovea_selector.select(noisy_pos)
            predicted = primary
        else:
            predicted = noisy_pos

        precision = compute_precision(true_pos, predicted)
        stability = compute_stability(true_pos, predicted)

        true_history.append(true_pos)
        pred_history.append(predicted)

        prev_pos = noisy_pos

        print(f"Frame {frame} | Precision: {precision:.4f} | Stability: {stability:.4f}")

    print("Simulation Complete.")

if __name__ == "__main__":
    main_loop()
