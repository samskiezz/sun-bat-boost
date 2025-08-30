# Metrics computation and validation
import numpy as np
from prometheus_client import Histogram, Counter

def compute_metrics(run):
    """Compute comprehensive training metrics"""
    
    metrics = run.get("metrics", {})
    
    # Validate required metrics
    required = ["mae", "loss_curve"]
    for req in required:
        if req not in metrics:
            raise ValueError(f"Missing required metric: {req}")
    
    # Add derived metrics
    loss_curve = metrics["loss_curve"]
    if len(loss_curve) >= 2:
        metrics["loss_improvement"] = (loss_curve[0] - loss_curve[-1]) / loss_curve[0] if loss_curve[0] > 0 else 0
        metrics["loss_stability"] = np.std(loss_curve[-5:]) if len(loss_curve) >= 5 else 0
    
    # Sharpe-like ratio for training stability
    if "loss_improvement" in metrics and "loss_stability" in metrics:
        if metrics["loss_stability"] > 0:
            metrics["training_sharpe"] = metrics["loss_improvement"] / metrics["loss_stability"]
        else:
            metrics["training_sharpe"] = float('inf')
    
    # Performance classification
    mae = metrics["mae"]
    if mae < 0.1:
        metrics["performance_tier"] = "excellent"
    elif mae < 0.5:
        metrics["performance_tier"] = "good"
    elif mae < 1.0:
        metrics["performance_tier"] = "acceptable"
    else:
        metrics["performance_tier"] = "poor"
    
    return metrics

# Prometheus observers for latency tracking
TRAINING_TIME = Histogram("training_duration_seconds", "Training time per model")
INFERENCE_TIME = Histogram("inference_duration_seconds", "Inference time per request")