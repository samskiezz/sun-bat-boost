import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Simple API routes for development
const apiRoutes = {
  '/api/health': () => ({
    status: "running",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      nasa_power: "available", 
      quantum_optimizers: "operational"
    }
  }),
  
  '/api/features/poa': (url: URL) => {
    const lat = parseFloat(url.searchParams.get('lat') || '0');
    const lng = parseFloat(url.searchParams.get('lng') || '0');
    const tilt = parseFloat(url.searchParams.get('tilt') || '0');
    const azimuth = parseFloat(url.searchParams.get('azimuth') || '0');
    const start = url.searchParams.get('start') || '';
    const end = url.searchParams.get('end') || '';

    if (!lat || !lng || !start || !end) {
      throw new Error("Missing required parameters: lat, lng, start, end");
    }

    // Generate synthetic POA data
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const daily = [];
    const seasonalFactor = lat < 0 ? 0.7 : 1.3;
    const tiltFactor = Math.cos((tilt - 30) * Math.PI / 180) * 0.2 + 0.9;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const basePoa = 5.5 + Math.sin(i * 0.3) * 1.5;
      const poaKwh = basePoa * seasonalFactor * tiltFactor;
      
      daily.push({
        date: dateStr,
        poa_kwh: Math.round(poaKwh * 100) / 100
      });
    }

    return {
      daily,
      hourly: [], // Simplified for demo
      meta: {
        source: "NASA_POWER_API_Synthetic",
        cached: false,
        location: { lat, lng }
      }
    };
  }
};

// API middleware for handling local routes
function apiMiddleware() {
  return {
    name: 'api-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api', async (req: any, res: any, next: any) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const pathname = url.pathname;
          
          // Handle quantum dispatch POST requests
          if (pathname === '/api/quantum/dispatch' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => body += chunk);
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const { prices, pv, load, constraints, solver } = data;
                
                // Generate optimized schedule
                const schedule = prices.map((price: number, t: number) => {
                  const netLoad = load[t] - pv[t];
                  let charge = 0, discharge = 0;
                  
                  if (solver === 'milp') {
                    if (price < 0.3) charge = Math.min(2, constraints.P_ch_max);
                    else if (price > 0.4) discharge = Math.min(2, constraints.P_dis_max);
                  } else if (solver === 'qaoa') {
                    // Quantum-inspired randomness
                    if (Math.random() > 0.5 && price < 0.35) charge = constraints.P_ch_max * 0.8;
                    else if (Math.random() > 0.3 && price > 0.35) discharge = constraints.P_dis_max * 0.9;
                  } else if (solver === 'anneal') {
                    // Simulated annealing with temperature
                    const temp = Math.exp(-t * 0.5);
                    if (price < 0.35 + temp * 0.1) charge = constraints.P_ch_max * (1 - temp * 0.3);
                    else discharge = constraints.P_dis_max * (1 - temp * 0.2);
                  }
                  
                  return {
                    time_step: t,
                    charge_power: charge,
                    discharge_power: discharge,
                    grid_import: Math.max(0, netLoad - discharge + charge),
                    grid_export: Math.max(0, pv[t] - load[t] - charge),
                    battery_soc: 0.5
                  };
                });
                
                const result = {
                  schedule,
                  metadata: { solver, algorithm: `${solver.toUpperCase()} Optimization` },
                  constraints_satisfied: true,
                  objective_value: schedule.reduce((sum: number, s: any, i: number) => 
                    sum + (s.grid_import - s.grid_export) * prices[i], 0)
                };
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid request body' }));
              }
            });
            return;
          }
          
          // Handle GET routes
          if (req.method === 'GET' && apiRoutes[pathname as keyof typeof apiRoutes]) {
            try {
              const handler = apiRoutes[pathname as keyof typeof apiRoutes];
              const result = handler(url);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
              return;
            } catch (error) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'API error' }));
              return;
            }
          }
          
          // Continue to proxy for unhandled routes
          next();
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'development' && apiMiddleware(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
