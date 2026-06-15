class RecoveryAnalyzer:
    def compute_recovery_time(self, lost_frame, regained_frame):
        return regained_frame - lost_frame
