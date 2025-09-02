# ☀️ Sun-Bat Boost - World-Class Solar Optimization Platform

A comprehensive solar and battery optimization platform featuring NASA satellite data, quantum optimization, and Australian compliance tools.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run both frontend and backend
npm run dev:all

# Or run individually
npm run dev      # Frontend only (port 8080)
npm run dev:api  # Backend only (port 8000)
```

### Using Docker

```bash
# Run backend with Docker
docker-compose up

# Access at:
# - Frontend: http://localhost:8080  
# - Backend: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

## ✨ Features

### 🆓 Lite Mode (Default)
- ✅ Solar & battery ROI calculators
- ✅ OCR bill upload & analysis
- ✅ AEST timezone handling
- ✅ Basic compliance hints
- ✅ CEC-approved product database

### 🏆 Pro Mode (Toggle top-left)
- 🛰️ **NASA POWER Integration** - Satellite irradiance data (no API key required)
- ⚡ **POA Physics** - Plane-of-array calculations via pvlib
- 🔬 **Quantum Optimization** - Three optimization engines:
  - Classical MILP (OR-Tools)
  - Quantum QAOA (Qiskit Aer)
  - Simulated Annealing (Neal)
- 🇦🇺 **AUS Compliance** - AS/NZS standards validation
- 📊 **Advanced Analytics** - Uncertainty quantification
- 🔗 **Scenario Sharing** - Shareable calculation links

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
src/
├── components/           # Reusable UI components
├── config/              # Feature flags & app settings  
├── hooks/               # Custom React hooks
├── utils/               # Utility functions (AEST time, etc.)
├── api/                 # API client functions
├── aus/                 # Australian compliance helpers
└── test/                # Test setup
```

### Backend (FastAPI + Python)
```
ml-svc/
├── app.py              # Main FastAPI application
├── ingest/             # NASA POWER data ingestion
├── features/           # Solar physics calculations
├── quantum/            # Quantum optimization algorithms
├── optim/              # Classical optimization
├── routers/            # API route handlers
└── tests/              # Backend tests
```

## 🌐 API Endpoints

### Core Features
- `GET /api/features/poa` - NASA POWER + POA physics
- `POST /api/quantum/dispatch` - Battery optimization
- `GET /api/status` - Service health
- `GET /api/models` - ML model status

### Example Usage

```typescript
// Fetch satellite irradiance data
import { fetchPoaDaily } from "@/api/nasaPower";

const poaData = await fetchPoaDaily(
  -33.8688,  // latitude
  151.2093,  // longitude  
  20,        // tilt angle
  0,         // azimuth
  "2025-01-01",
  "2025-01-31"
);
```

```bash
# Battery dispatch optimization
curl -X POST "http://localhost:8000/quantum/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [0.3, 0.25, 0.5, 0.6],
    "pv": [0, 0.5, 1.2, 0.9], 
    "load": [0.6, 0.7, 0.8, 0.9],
    "constraints": {
      "P_ch_max": 5,
      "P_dis_max": 5,
      "soc_min": 0.1,
      "soc_max": 1
    },
    "solver": "qaoa"
  }'
```

## 🧪 Testing

### Frontend Tests
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run lint              # Code linting
npm run format            # Code formatting
```

### Backend Tests  
```bash
cd ml-svc
python -m pytest tests/ -v     # Run all tests
python -m pytest tests/test_poa.py -v    # Specific test
```

## 🚢 Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Environment variables are auto-configured via `vercel.json`
3. Deploy triggers on push to `main`

### Backend (Render)
1. Connect GitHub repo to Render
2. Uses `render.yaml` configuration
3. Auto-deploys from `ml-svc/` directory

### Environment Variables
```bash
# Optional - for enhanced features
VITE_MAPTILER_KEY=your_key_here     # Static satellite imagery
CACHE_DIR=/tmp/nasa-cache           # NASA data cache (backend)
```

## 🔧 Development

### Adding New Features
1. Update `src/config/featureFlags.ts` to gate new functionality
2. Add feature to `src/config/featuresList.ts` for documentation
3. Implement behind appropriate Pro/Lite mode checks
4. Add tests in `src/` (frontend) or `ml-svc/tests/` (backend)

### Adding Quantum Optimizers
1. Create solver in `ml-svc/quantum/your_solver.py`
2. Add route handler in `ml-svc/routers/quantum.py`
3. Update UI dropdown in `src/components/Optimizers/DispatchOptimizer.tsx`

## 📋 Feature Roadmap

**50 Features Implemented/Planned:**

| Category | Ready | Todo | 
|----------|--------|------|
| Data & Physics | 3 | 7 |
| ML & Optimizers | 3 | 12 |
| UX Features | 3 | 7 |
| AUS Compliance | 1 | 9 |
| Platform | 1 | 4 |

See `src/config/featuresList.ts` for complete feature matrix.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `npm run test && cd ml-svc && python -m pytest`
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Live Demo](https://sun-bat-boost.vercel.app)
- [API Documentation](https://sun-bat-boost-api.onrender.com/docs)
- [Feature Requests](https://github.com/your-org/sun-bat-boost/issues)

---

**Built with ⚡ by the Solar Optimization Team**

*Toggle **LITE ⇄ PRO** in the top-left corner to unlock quantum optimization!*