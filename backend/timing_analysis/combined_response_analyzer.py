class CombinedResponseAnalyzer:
    def analyze(self, reflex_latency, brain_latency):
        total = reflex_latency + brain_latency
        dominance = "Reflex" if reflex_latency < brain_latency else "Brain"
        return {
            "total_latency": total,
            "dominant_system": dominance
        }
