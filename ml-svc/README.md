# ML Service

Real machine learning training service for solar ROI predictions, battery dispatch optimization, and forecasting.

## Features

- **Real Training**: XGBoost, LSTM, and optimization models with actual weight changes
- **No-Op Guards**: Prevents fake training - checks weight deltas and loss improvements
- **ONNX Export**: All models exported to ONNX with parity validation
- **Regression Detection**: Blocks model updates that perform worse than baseline
- **Prometheus Metrics**: Built-in telemetry and performance monitoring

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set API key for training endpoints
export ML_SVC_API_KEY="your-secure-key-here"

# Run service
uvicorn app:app --host 0.0.0.0 --port 8000

# Health check
curl http://localhost:8000/healthz
```

## API Endpoints

### Training (Protected)
```bash
# Train ROI model
curl -X POST http://localhost:8000/train \
  -H "x-api-key: $ML_SVC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task":"roi","dataset":{"X":[[1,2,3,4,5]],"y_annual_savings_AUD":[2400]}}'
```

### Prediction (Public)
```bash
# Solar ROI prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "task": "solar_roi",
    "input": {
      "usage_30min": [1.2, 1.5, 0.8, ...],
      "tariff": {"import": [{"price": 0.28, "start": "00:00", "end": "24:00"}]},
      "shading_index": 0.1
    }
  }'
```

### Status & Models
```bash
# Service status
curl http://localhost:8000/status

# List trained models
curl http://localhost:8000/models

# Prometheus metrics
curl http://localhost:8000/metrics
```

## Model Types

1. **ROI Regressor** (`roi`): XGBoost model for annual savings prediction
2. **Forecast TFT** (`forecast`): LSTM/statistical model for load forecasting  
3. **Dispatch Optimizer** (`dispatch`): OR-Tools MIP for battery scheduling

## Training Validation

All training includes:
- Weight hash comparison (no-op detection)
- Loss improvement validation (≥2%)
- Gradient finite checks (≥95%)
- ONNX export with parity validation
- Baseline regression checks

## Deployment

### Docker
```bash
docker build -t ml-svc .
docker run -p 8000:8000 -e ML_SVC_API_KEY=secret ml-svc
```

### Cloud Deploy
- **Render**: Connect repo, set `ML_SVC_API_KEY` in environment
- **Fly.io**: `fly deploy` with fly.toml
- **Cloud Run**: Build and deploy container

## Environment Variables

- `ML_SVC_API_KEY`: API key for training endpoints (required)
- `PORT`: Service port (default: 8000)
- `GIT_SHA`: Git commit SHA for model versioning