# ONNX validation and parity checking
import numpy as np

def parity_check(sklearn_model, onnx_path, X_val, tol=1e-3):
    """Check ONNX model parity with original model"""
    try:
        import onnxruntime as ort
        
        # Predictions from original model
        pred_sklearn = sklearn_model.predict(X_val)
        
        # Predictions from ONNX
        sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        input_name = sess.get_inputs()[0].name
        pred_onnx = sess.run(None, {input_name: X_val.astype(np.float32)})[0]
        
        # Check parity
        if pred_onnx.shape != pred_sklearn.shape:
            raise Exception(f"Shape mismatch: ONNX {pred_onnx.shape} vs sklearn {pred_sklearn.shape}")
        
        max_diff = np.max(np.abs(pred_sklearn.flatten() - pred_onnx.flatten()))
        if max_diff > tol:
            raise Exception(f"ONNX parity failed: max diff {max_diff:.6f} > {tol}")
        
        mean_diff = np.mean(np.abs(pred_sklearn.flatten() - pred_onnx.flatten()))
        print(f"✅ ONNX parity check passed: mean diff {mean_diff:.6f}, max diff {max_diff:.6f}")
        
        return True
        
    except ImportError:
        print("⚠️ onnxruntime not available, skipping parity check")
        return True
    except Exception as e:
        print(f"❌ ONNX parity check failed: {e}")
        raise