# No-op training detection guards
def assert_not_noop(run):
    """Assert training is not no-op - critical validation"""
    
    # Check 1: Weight hash must change (except for initial runs)
    w_before = run["meta"]["weight_hash_before"]
    w_after = run["meta"]["weight_hash_after"]
    
    if w_before != "NA" and w_before != "initial" and w_before == w_after:
        raise Exception("NO_OP_TRAINING_DETECTED: weight hash unchanged")
    
    # Check 2: Loss must decrease by at least 2%
    loss_curve = run["metrics"]["loss_curve"]
    if len(loss_curve) >= 2:
        initial_loss = loss_curve[0]
        final_loss = loss_curve[-1]
        
        if initial_loss > 0 and (initial_loss - final_loss) / initial_loss < 0.02:
            raise Exception(f"NO_OP_TRAINING_DETECTED: loss decrease {((initial_loss - final_loss) / initial_loss * 100):.1f}% < 2%")
    
    # Check 3: NaN gradient ratio (for neural networks)
    nan_grad_ratio = run["metrics"].get("nan_grad_ratio", 0)
    if nan_grad_ratio > 0.05:
        raise Exception(f"NO_OP_TRAINING_DETECTED: {nan_grad_ratio*100:.1f}% NaN gradients > 5%")
    
    # Check 4: Ensure metrics are finite
    mae = run["metrics"]["mae"]
    if not (0 < mae < 1e6):
        raise Exception(f"NO_OP_TRAINING_DETECTED: invalid MAE {mae}")
    
    print(f"✅ Training validation passed: loss {loss_curve[0]:.3f} → {loss_curve[-1]:.3f}, MAE {mae:.3f}")
    return True