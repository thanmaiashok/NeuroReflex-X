def compare_models(results_dict):
    """
    Rank models by score (higher = better).
    Returns full ranking, best/worst model names, and margin between them.
    """
    if not results_dict:
        return {}
    sorted_models = sorted(results_dict.items(), key=lambda x: x[1], reverse=True)
    best_name, best_score = sorted_models[0]
    worst_name, worst_score = sorted_models[-1]
    return {
        "best": best_name,
        "worst": worst_name,
        "best_score": round(best_score, 4),
        "worst_score": round(worst_score, 4),
        "margin": round(best_score - worst_score, 4),
        "ranking": [
            {"rank": i + 1, "model": k, "score": round(v, 4)}
            for i, (k, v) in enumerate(sorted_models)
        ],
    }
