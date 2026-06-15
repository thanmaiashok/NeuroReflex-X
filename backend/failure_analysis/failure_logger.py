class FailureLogger:
    def __init__(self):
        self.failures = []

    def log(self, frame, reason):
        self.failures.append({"frame": frame, "reason": reason})

    def get_logs(self):
        return self.failures
