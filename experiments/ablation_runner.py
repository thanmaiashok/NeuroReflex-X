from backend.evaluation.ablation_study import run_ablation

def run_ablation_tests():
    configs = [
        run_ablation(True, True, True),
        run_ablation(False, True, True),
        run_ablation(True, False, True),
        run_ablation(True, True, False)
    ]

    for cfg in configs:
        print("Testing Config:", cfg)

if __name__ == "__main__":
    run_ablation_tests()
