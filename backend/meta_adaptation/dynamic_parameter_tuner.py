class DynamicParameterTuner:
    def tune(self, error):
        if error > 1.0:
            return {"smoothing_alpha": 0.8}
        else:
            return {"smoothing_alpha": 0.6}
