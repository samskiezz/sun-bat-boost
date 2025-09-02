export interface Feature {
  id: string;
  name: string;
  description: string;
  category: "data" | "physics" | "ml" | "optimizer" | "ux" | "aus" | "platform" | "devex";
  status: "ready" | "todo" | "beta";
  proOnly: boolean;
}

export const featuresList: Feature[] = [
  // Data & Physics (10 features)
  { id: "nasa-power", name: "NASA POWER Integration", description: "Satellite irradiance data with no API key", category: "data", status: "ready", proOnly: true },
  { id: "poa-physics", name: "POA Physics", description: "Plane-of-array calculations via pvlib", category: "physics", status: "ready", proOnly: true },
  { id: "aest-time", name: "AEST Time Intelligence", description: "Australian timezone handling", category: "data", status: "ready", proOnly: false },
  { id: "weather-integration", name: "Weather Data", description: "BOM weather integration", category: "data", status: "todo", proOnly: true },
  { id: "shade-analysis", name: "Shade Analysis", description: "Computer vision shading detection", category: "physics", status: "todo", proOnly: true },
  { id: "tilt-optimization", name: "Tilt Optimization", description: "Optimal panel angle calculations", category: "physics", status: "todo", proOnly: true },
  { id: "soil-conditions", name: "Soil Analysis", description: "Ground mount suitability", category: "data", status: "todo", proOnly: true },
  { id: "microclimate", name: "Microclimate Modeling", description: "Local weather variations", category: "physics", status: "todo", proOnly: true },
  { id: "satellite-imagery", name: "Satellite Imagery", description: "Roof analysis from satellite data", category: "data", status: "todo", proOnly: true },
  { id: "energy-monitoring", name: "Energy Monitoring", description: "Real-time system monitoring", category: "data", status: "todo", proOnly: true },

  // ML & Optimizers (15 features)  
  { id: "quantum-qaoa", name: "Quantum QAOA", description: "Quantum optimization via QAOA", category: "optimizer", status: "ready", proOnly: true },
  { id: "quantum-anneal", name: "Quantum Annealing", description: "Simulated annealing optimization", category: "optimizer", status: "ready", proOnly: true },
  { id: "dispatch-optimizer", name: "Dispatch Optimizer", description: "Battery dispatch optimization", category: "optimizer", status: "ready", proOnly: true },
  { id: "forecast-uncertainty", name: "Forecast Uncertainty", description: "Probabilistic energy forecasting", category: "ml", status: "todo", proOnly: true },
  { id: "demand-forecasting", name: "Demand Forecasting", description: "Load prediction algorithms", category: "ml", status: "todo", proOnly: true },
  { id: "price-forecasting", name: "Price Forecasting", description: "Electricity price predictions", category: "ml", status: "todo", proOnly: true },
  { id: "degradation-modeling", name: "Degradation Modeling", description: "Panel performance over time", category: "ml", status: "todo", proOnly: true },
  { id: "anomaly-detection", name: "Anomaly Detection", description: "System fault detection", category: "ml", status: "todo", proOnly: true },
  { id: "reinforcement-learning", name: "Reinforcement Learning", description: "Adaptive control strategies", category: "ml", status: "todo", proOnly: true },
  { id: "ensemble-models", name: "Ensemble Models", description: "Multiple model predictions", category: "ml", status: "todo", proOnly: true },
  { id: "transfer-learning", name: "Transfer Learning", description: "Cross-site model adaptation", category: "ml", status: "todo", proOnly: true },
  { id: "federated-learning", name: "Federated Learning", description: "Privacy-preserving ML", category: "ml", status: "todo", proOnly: true },
  { id: "portfolio-optimization", name: "Portfolio Optimization", description: "Multi-asset energy planning", category: "optimizer", status: "todo", proOnly: true },
  { id: "risk-assessment", name: "Risk Assessment", description: "Financial risk modeling", category: "ml", status: "todo", proOnly: true },
  { id: "scenario-analysis", name: "Scenario Analysis", description: "What-if scenario modeling", category: "ml", status: "todo", proOnly: true },

  // UX Features (10 features)
  { id: "ocr-upload", name: "OCR Upload", description: "Bill and document scanning", category: "ux", status: "ready", proOnly: false },
  { id: "calculators", name: "ROI Calculators", description: "Solar and battery calculators", category: "ux", status: "ready", proOnly: false },
  { id: "pdf-export", name: "PDF Export", description: "Downloadable reports", category: "ux", status: "ready", proOnly: false },
  { id: "share-links", name: "Share Links", description: "Scenario sharing URLs", category: "ux", status: "todo", proOnly: true },
  { id: "mobile-app", name: "Mobile App", description: "Native mobile application", category: "ux", status: "todo", proOnly: false },
  { id: "dashboard", name: "Interactive Dashboard", description: "Real-time monitoring dashboard", category: "ux", status: "todo", proOnly: true },
  { id: "3d-visualization", name: "3D Visualization", description: "3D roof and panel modeling", category: "ux", status: "todo", proOnly: true },
  { id: "ar-preview", name: "AR Preview", description: "Augmented reality panel placement", category: "ux", status: "todo", proOnly: true },
  { id: "voice-interface", name: "Voice Interface", description: "Voice-controlled interactions", category: "ux", status: "todo", proOnly: true },
  { id: "accessibility", name: "Accessibility", description: "WCAG 2.1 AA compliance", category: "ux", status: "todo", proOnly: false },

  // AUS Compliance (10 features)
  { id: "aus-compliance", name: "AUS Compliance Guards", description: "Australian standard compliance hints", category: "aus", status: "ready", proOnly: true },
  { id: "stc-calculator", name: "STC Calculator", description: "Small-scale Technology Certificates", category: "aus", status: "todo", proOnly: false },
  { id: "dnsp-integration", name: "DNSP Integration", description: "Distribution network service providers", category: "aus", status: "todo", proOnly: true },
  { id: "aemo-integration", name: "AEMO Integration", description: "Australian Energy Market Operator data", category: "aus", status: "todo", proOnly: true },
  { id: "nem-pricing", name: "NEM Pricing", description: "National Electricity Market prices", category: "aus", status: "todo", proOnly: true },
  { id: "vpp-integration", name: "VPP Integration", description: "Virtual Power Plant participation", category: "aus", status: "todo", proOnly: true },
  { id: "rcd-compliance", name: "RCD Compliance", description: "Safety switch requirements", category: "aus", status: "todo", proOnly: false },
  { id: "meter-upgrade", name: "Meter Upgrade", description: "Smart meter requirements", category: "aus", status: "todo", proOnly: false },
  { id: "export-limits", name: "Export Limits", description: "Network export capacity limits", category: "aus", status: "todo", proOnly: true },
  { id: "fire-safety", name: "Fire Safety", description: "AS 1926 fire safety compliance", category: "aus", status: "todo", proOnly: false },

  // Platform Features (5 features)
  { id: "multi-tenancy", name: "Multi-Tenancy", description: "Multiple organization support", category: "platform", status: "todo", proOnly: true },
  { id: "api-gateway", name: "API Gateway", description: "RESTful API access", category: "platform", status: "ready", proOnly: false },
  { id: "webhooks", name: "Webhooks", description: "Event-driven integrations", category: "platform", status: "todo", proOnly: true },
  { id: "data-export", name: "Data Export", description: "CSV/JSON data exports", category: "platform", status: "todo", proOnly: true },
  { id: "backup-restore", name: "Backup & Restore", description: "Data backup and recovery", category: "platform", status: "todo", proOnly: true },
];

export function getFeaturesByCategory(category: Feature["category"]): Feature[] {
  return featuresList.filter(f => f.category === category);
}

export function getReadyFeatures(): Feature[] {
  return featuresList.filter(f => f.status === "ready");
}

export function getProFeatures(): Feature[] {
  return featuresList.filter(f => f.proOnly);
}