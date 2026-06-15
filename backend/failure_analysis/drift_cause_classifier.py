class DriftCauseClassifier:
    def classify(self, motion_energy, noise_level):
        if noise_level > 0.5:
            return "Sensor Noise"
        elif motion_energy > 1.5:
            return "Sudden Acceleration"
        else:
            return "Model Drift"
