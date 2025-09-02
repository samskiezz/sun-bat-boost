export type AppMode = "lite" | "pro";

export const featureFlags = (mode: AppMode) => ({
  // Always on
  ocrUpload: true,
  calculators: true,
  roiPdf: true,

  // Pro features
  diagnostics: mode === "pro",
  nasaIrradiance: mode === "pro",
  poaPhysics: mode === "pro",
  dispatchOptimizer: mode === "pro",
  quantumQAOA: mode === "pro",
  quantumAnneal: mode === "pro",
  explainability: mode === "pro",
  forecastUncertainty: mode === "pro",
  ausComplianceGuards: mode === "pro",
  scenarioShareLinks: mode === "pro",
});

export default featureFlags;