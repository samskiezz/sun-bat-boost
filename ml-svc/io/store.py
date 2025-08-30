# Artifact storage and baseline management
import os
import json
import shutil
from datetime import datetime

def save_artifacts(model_type, run):
    """Save training artifacts to structured storage"""
    
    run_id = run["meta"]["weight_hash_after"]
    base_path = f"artifacts/{model_type}/{run_id}"
    
    # Create directory structure
    os.makedirs(base_path, exist_ok=True)
    os.makedirs(f"{base_path}/checkpoints", exist_ok=True)
    
    # Save metadata
    meta_path = f"{base_path}/meta.json"
    with open(meta_path, 'w') as f:
        json.dump({
            "run_id": run_id,
            "model_type": model_type,
            "timestamp": datetime.now().isoformat(),
            "git_sha": os.environ.get("GIT_SHA", "local"),
            **run["meta"]
        }, f, indent=2)
    
    # Save metrics
    metrics_path = f"{base_path}/metrics.json"
    with open(metrics_path, 'w') as f:
        json.dump(run["metrics"], f, indent=2)
    
    # Copy ONNX model to artifacts
    if os.path.exists(run["onnx_path"]):
        onnx_dest = f"{base_path}/model.onnx"
        shutil.copy2(run["onnx_path"], onnx_dest)
        run["onnx_path"] = onnx_dest  # Update path
    
    # Save model checkpoint if available
    if "model" in run:
        try:
            import joblib
            checkpoint_path = f"{base_path}/checkpoints/model.pkl"
            joblib.dump(run["model"], checkpoint_path)
        except Exception as e:
            print(f"Warning: Could not save model checkpoint: {e}")
    
    print(f"✅ Artifacts saved to {base_path}")
    return base_path

def load_baseline(model_type):
    """Load baseline metrics for regression checking"""
    baseline_path = f"baselines/{model_type}_baseline.json"
    
    if os.path.exists(baseline_path):
        with open(baseline_path, 'r') as f:
            return json.load(f)
    
    return None

def save_baseline(model_type, metrics):
    """Save new baseline metrics"""
    os.makedirs("baselines", exist_ok=True)
    baseline_path = f"baselines/{model_type}_baseline.json"
    
    baseline_data = {
        "metrics": metrics,
        "updated_at": datetime.now().isoformat(),
        "model_type": model_type
    }
    
    with open(baseline_path, 'w') as f:
        json.dump(baseline_data, f, indent=2)
    
    print(f"✅ Baseline updated for {model_type}")

def list_artifacts(model_type=None):
    """List available artifacts"""
    artifacts = []
    base_dir = "artifacts"
    
    if not os.path.exists(base_dir):
        return artifacts
    
    for model_dir in os.listdir(base_dir):
        if model_type and model_dir != model_type:
            continue
            
        model_path = os.path.join(base_dir, model_dir)
        if os.path.isdir(model_path):
            for run_id in os.listdir(model_path):
                run_path = os.path.join(model_path, run_id)
                meta_path = os.path.join(run_path, "meta.json")
                
                if os.path.exists(meta_path):
                    with open(meta_path, 'r') as f:
                        meta = json.load(f)
                    
                    artifacts.append({
                        "model_type": model_dir,
                        "run_id": run_id,
                        "path": run_path,
                        "meta": meta
                    })
    
    return sorted(artifacts, key=lambda x: x["meta"]["timestamp"], reverse=True)