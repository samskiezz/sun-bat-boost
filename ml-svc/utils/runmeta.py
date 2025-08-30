# Run metadata for reproducibility
import hashlib
import json
import random
import numpy as np

def run_meta(payload, dataset):
    """Generate run metadata with data hash and seed"""
    seed = payload.get("seed", 1337)
    
    # Set seeds for reproducibility
    random.seed(seed)
    np.random.seed(seed)
    
    try:
        import tensorflow as tf
        tf.random.set_seed(seed)
    except ImportError:
        pass
    
    # Hash dataset for reproducibility tracking
    dataset_str = json.dumps(dataset, sort_keys=True, default=str)
    data_hash = hashlib.sha256(dataset_str.encode()).hexdigest()[:12]
    
    return {
        "seed": seed,
        "data_hash": data_hash,
        "schema_version": "v1",
        "dataset_size": len(str(dataset))
    }