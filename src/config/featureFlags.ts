export type AppMode = "lite" | "pro";

export const featureFlags = (mode: AppMode) => ({
  // Always on
  ocrUpload: true,
  calculators: true,
  roiPdf: true,

  // Pro features
  nasaIrradiance: mode === "pro",
  poaPhysics: mode === "pro",
  dispatchOptimizer: mode === "pro",
  quantumQAOA: mode === "pro",
  quantumAnneal: mode === "pro",
  forecastUncertainty: mode === "pro",
  ausComplianceGuards: mode === "pro",
  scenarioShareLinks: mode === "pro",
});

export default featureFlags;