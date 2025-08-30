# ROI Calculator App – Master Function & Module Index

## Bootstrapping & Config
- `initApp()`
- `loadEnvConfig()`
- `AppConfig`
- `GlassHoloThemeProvider`
- `registerServiceWorker()`
- `initErrorBoundary()`
- `initAnalytics()`

## Modes, Feature Flags & Accuracy
- `getAppMode()`, `setAppMode(mode)`
- `featureFlags(mode)`
- `ProLiteToggle`
- `FeatureGate`
- `getAccuracyMode()`, `setAccuracyMode(mode: "preview"|"standard"|"exact")`

## Routing, Layout & State
- `AppRouter`, `ProtectedRoute`
- `MainLayout`, `SidebarLayout`
- `useAppStore()`, `useWizardState()`, `useUiPrefs()`
- `resetWizard()`, `hydrateWizard(payload)`
- `hydrateFromShareLink(token)`, `createShareLink(payload)`, `parseShareLink(token)`

## Steps / Tabs
- `StepLocation`
- `StepBillAndUsage`
- `StepSystemSizing`
- `StepSavingsAndROI`
- `StepReviewAndExport`
- `StepComplianceChecks`

## Location, Addressing & DNSP
- `initAddressAutocomplete(inputEl)`
- `resolveAddressToLatLng(address)`
- `reverseGeocode(lat, lng)`
- `getPostcode(lat, lng)`
- `normalizePostcode(pc)`
- `getDnspByPostcode(postcode)`
- `getDnsnState(postcode)`
- `getExportCapByDnsp(dnsp, phase, meterType)`
- `getMeterTypeByNmi(nmi)`
- `getPhaseInfoBySupply(details)`
- `loadDnspsStaticDb()`, `refreshDnspsFromSource()`
- `getFormSubmissionLink(dnsp)`
- `requiresNetworkProtection(dnsp, pvSize)`
- `getSmartMeterRequirement(dnsp)`
- `getDefaultExportLimit(dnsp, phase)`
- `getExportLimiterOptions(dnsp)`

## Shading, Roof & Site Analysis
- `SiteShadingAnalyzer`
- `runShadingAnalysis(lat, lng, roofPolygon?)`
- `estimateRoofArea(roofPolygon?)`
- `calcShadingFactor(satTiles, sunPath)`
- `calcRoofTiltAzimuth(roofVector)`
- `calcSunPath(lat, lng, dateRange?)`
- `estimateMaxPanels(roofArea, panelDims)`
- `validateRoofFit(panelCount, panelDims, roofArea)`
- `siteAnalysisToRoiInputs(siteData)`
- `RoofPolygonEditor`
- `MapRoofPicker`

## Tariffs, Bills & Usage
- `fetchTariffsByPostcode(postcode)`
- `selectDefaultTariff(tariffs)`
- `parseManualBill({period, amount})`
- `parseManualUsage({kwhPerDay, peakOffpeakSplit})`
- `calcBaselineBillFromTariff(usageProfile, tariff)`
- `suggestAutoSizingFromBill(bill, tariffs)`
- `simulateTariffRise(plan, pct)`
- `applyDemandCharge(profile, plan)`

## OCR Pipeline (PDF/Image)
- `uploadBillFile(file)`, `detectMimeType(file)`
- `ocrExtractText(file)`
- `ocrExtractTables(text)`
- `ocrParseBillFields(text, tables)`
- `fallbackRegexExtract(text)`
- `normalizeOcrFields(raw)`
- `ocrToUsageModel(fields)`
- `ocrConfidenceScore(fields)`
- `logOcrError(err, meta)`
- `sanitizeOcrJson(input)`
- `ocrProviderAdapter(name)`
- `pdfImagePreprocessor(opts)`
- `billClassifier(text)`

## Catalog Data (CEC + Local)
- `loadLocalCatalog()`
- `refreshCecPanels()`, `refreshCecInverters()`, `refreshCecBatteries()`
- `mergeCatalogSources(local, cec)`
- `indexCatalogForSearch(catalog)`
- `searchCatalog(query, filters)`
- `getPanelById(id)`, `getInverterById(id)`, `getBatteryById(id)`
- `validateCecProduct(product)`
- `hydrateCatalogFromScrape()`
- `exportCatalogCsv()`
- `validateCatalogIntegrity()`

## Product Picker (UI + Logic)
- `ProductPickerForm`
- `useProductPickerStore()`
- `filterPanelsByRoof(list, roofFit)`
- `filterInvertersByRules(list, pvSize)`
- `filterBatteriesByStackRules(list)`
- `validateSelectionsAgainstCec(pv, inverter, battery)`
- `handleProductIdTypeSafety()`
- `PvPickerCard`, `InverterPickerCard`, `BatteryPickerCard`
- `StackSizeSelector`

## Battery Stack Logic (Brand-Specific)
- `expandBatteryStacks(baseModule)`
- `getStackOptions(batteryModel)`
- `validateStackSize(kwh, min, max, step)`
- `suggestStackForNightLoad(nightKwh)`
- `applyBrandSpecificStackRules(brand, model)`
- `expandSigenergyStacks(model)`
- `expandSungrowSBHStacks(model)`
- `expandAlphaEssStacks(model)`
- `expandFoxEssStacks(model)`
- `expandGoodWeStacks(model)`
- `powerwallFixedSizeAdapter()`

## System Sizing & Electrical Rules
- `sizePvFromBill(bill, tariff, shadingIndex)`
- `sizeBatteryFromNightLoad(nightKwh, reservePct)`
- `applySafetyFactor(pvKw, factor=1.25)`
- `enforcePvToInverterRatio(pvKw, inverterAcKw, max=1.33)`
- `validateHybridVsAcCoupled(inverter, battery, controller)`
- `suggestAcCouplingIfNeeded(inverter, battery)`
- `calcMaxExportGivenDnsp(dnsp, meterType, phase)`
- `calcPvProduction(lat, lng, tilt, azimuth, shading)`
- `pvDegradationCurve(year)`
- `batteryRoundTripLosses(profile)`
- `selectAcControllerForBattery(battery)`

## Compliance Guardrails (AS/NZS)
- `checkAs4777Limits(pvKw, inverterKw, phase)`
- `checkAs5033ArrayWiring(pvConfig)`
- `checkAs3000Wiring(switchboard)`
- `checkAs5139Clearances(batteryPlacement)`
- `checkDcIsolatorRequirements(pvConfig)`
- `checkEarthingAndLabelling(systemDesign)`
- `checkVoltageDrop(run, size, load)`
- `complianceReport(findings)`

## Export Limiting & Network Protection
- `isExportLimitingRequired(dnsp, pvSize)`
- `selectExportLimiter(deviceList, dnsp)`
- `calcExportLimiterSetpoint(dnsp, meterType)`
- `requiresRelayProtection(dnsp, cap)`
- `networkProtectionBOM(dnsp, size)`

## Rebates & Incentives
- `applyAllRebates(ctx)`
- `rebateBreakdownTable(inputs)`

**Federal STC**
- `calcStcRebate(pvKw, installDate, zone, deemingYears)`
- `getStcDeemingYears(installDate)`
- `getStcZoneByPostcode(postcode)`
- `STC_ZONE_MAP`, `STC_DEEMING_BY_YEAR`

**NSW**
- `calcNswBatteryPerKwh(usableKwh)`
- `applyNswVppIncentive(optIn)`
- `NswCheaperHomeBatteryRules`

**VIC**
- `calcVicSolarHomesPv(pvKw)`
- `calcVicBatteryRebate(usableKwh)`

**QLD**
- `calcQldBatteryBooster(usableKwh)`

**SA / WA / NT / TAS**
- `calcStateSpecificBatteryRebate(state, inputs)`

**VPP**
- `calcVppIncentive(provider, plan, battery)`
- `listVppPlansByPostcode(postcode)`
- `TeslaVppAdapter`, `AGLVppAdapter`, `EAuVppAdapter`, `AmberVppAdapter`

## Savings, Exports & ROI
- `estimateSelfConsumption(pvProfile, loadProfile)`
- `estimateExports(pvProfile, loadProfile)`
- `calcFeedInRevenue(exports, fitRate)`
- `calcVppRevenue(strategy, batteryProfile)`
- `combineSavingsStreams(selfUse, exports, vpp)`
- `calcUpfrontCost({pv, battery, installExtras})`
- `applyRebatesToCost(cost, rebates)`
- `calcAnnualSavings(baselineBill, newBill)`
- `calcPaybackYears(netCost, annualSavings)`
- `buildCashflowSeries(netCost, annualSavings, years=10)`
- `roiSummarySnapshot(inputs)`
- `sensitivityAnalysis(params)`
- `scenarioRunner(pess|base|optimistic)`

## Charts, Sliders & Holographic UI
- `PvSizeSlider`, `BatterySizeSlider`
- `RebateMeterGauge`, `ExportCapHealthBar`, `SavingsGauge`
- `HolographicSlider`
- `CrystalGauge`
- `AnimatedSavingsCounter`
- `HoloBanner`
- `renderCashflowChart(data)`
- `renderPaybackCurve(data)`
- `renderSavingsByStream(data)`

## Share, Export & Lead Capture
- `openLeadCaptureModal()`
- `validateLeadInputs(form)`
- `sendOtp(phone)`, `verifyOtp(code)`
- `createProposalPdf(payload)`
- `RoiReportTemplate`, `ProposalTemplate`
- `downloadPdf(blob)`
- `createShareUrl(payload)`, `copyShareUrlToClipboard()`
- `generatePublicResultsPage(payload)`

## API Endpoints
- `POST /api/ocr`
- `GET  /api/tariffs?postcode=`
- `GET  /api/dnsp?postcode=`
- `GET  /api/cec/panels`
- `GET  /api/cec/inverters`
- `GET  /api/cec/batteries`
- `POST /api/rebates/calc`
- `POST /api/roi/calc`
- `POST /api/export/pdf`
- `POST /api/share/create`
- `GET  /api/share/:token`
- `POST /api/shading/run`
- `GET  /api/catalog/search?q=`
- `POST /api/healthcheck`

## Schedulers & Refresh (Cron)
- `cronRefreshEnergyMadeEasy()`
- `cronRefreshCecLists()`
- `cronBackupStaticJson()`
- `cronPurgeOldShares()`
- `cronRebatesSync()`

## Scrapers & Adapters
- `scrapeEnergyMadeEasyTariffs()`
- `scrapeCecPanels()`, `scrapeCecInverters()`, `scrapeCecBatteries()`
- `scrapeWithPuppeteer(url)`, `scrapeWithPlaywright(url)`
- `parseCecTable(html)`, `normalizeCecRow(row)`
- `fetchPdfLinks(url)`

## Caching & Storage
- `cacheGet(key)`, `cacheSet(key, value, ttl)`
- `LRUCache`
- `kvStorePut(key, value)`, `kvStoreGet(key)`
- `putBlob(path, blob)`, `getBlob(path)`
- `StaticJsonFallbacks`

## Security & Privacy
- `hashLeadData(data)`
- `maskSensitiveFields(obj)`
- `rateLimit(ip, key)`
- `verifyWebhookSignature(sig, payload)`
- `csrfToken()`

## Errors, Logging & Telemetry
- `createUserError(message, code?)`
- `createSystemError(message, meta?)`
- `logEvent(name, props?)`
- `logError(err, context?)`
- `withErrorBoundary(component)`
- `trackStepView(step)`
- `trackProductPick(type, id)`
- `trackRebateApplied(type, value)`
- `trackShareCreated()`, `trackPdfDownloaded()`

## Dev Utilities & CLI
- `seedLocalCatalog()`, `seedDnsps()`, `seedTariffs()`
- `lintStackRules()`
- `genMockBills()`, `genMockCatalog()`
- `snapshotDb()`, `restoreDb(snapshot)`
- `exportTablesCsv()`

## Data Models / Types
- `BillInputs`, `BillOcrResult`
- `UsageProfile`, `LoadShape`
- `TariffPlan`, `PlanRate`
- `SiteAnalysis`, `SitePolygon`, `SunPath`
- `RoofFit`, `PanelDims`
- `CecPanel`, `CecInverter`, `CecBattery`
- `BatteryStackRule`
- `PvSelection`, `InverterSelection`, `BatterySelection`
- `RebateBreakdown`, `RebateProgram`
- `RoiResult`, `CashflowSeries`
- `SharePayload`, `PublicResult`

## DB Tables (Schema Names)
- `postcodes`
- `dnsp_rules`
- `cec_panels`
- `cec_inverters`
- `cec_batteries`
- `catalog_index`
- `tariffs`
- `rebate_programs`
- `vpp_plans`
- `leads`
- `shares`
- `audit_logs`

## Compliance & Installation Checks (Extras)
- `checkArrayIsolators(count, placement)`
- `checkIngressProtection(enclosure)`
- `checkCableSizes(mm2, runLen, amps)`
- `genComplianceChecklist(design)`
- `selectBackupTopology(fullHome|essential)`
- `switchboardUpgradeNeeded(design)`

## External Integrations (Hooks/Clients)
- `OpenSolarClient`
- `XeroClient`
- `GreenDealClient`
- `SimproClient`
- `TradeZoneAdapter`
- `OSWAdapter`
- `GmbPostHook`

## Theming, i18n & A11y
- `ThemeSwitcher`
- `IntlProvider`
- `formatCurrencyAUD(n)`
- `announceForScreenReader(text)`

## Performance & QA
- `prefetchStepAssets(step)`
- `lazyLoadChartLibs()`
- `memoizeCalc(fn)`
- `testRoiEngine.spec.ts`
- `testRebateEngine.spec.ts`
- `testProductPicker.spec.ts`
- `testOcrPipeline.spec.ts`
- `testDnspRules.spec.ts`

---

## Geo/ML (Polygons) — System Manager Tab

**Interactive Roof Polygon Analysis & Machine Learning Matching**

### Core Components
- `PolygonMonitorTab` - Interactive map interface for drawing and analyzing roof polygons (src/components/SystemManager/PolygonMonitorTab.tsx)

### Services & API Integration  
- `embedPolygon(payload)` - Generate vector embeddings for polygon features (src/services/geoml-client.ts)
- `matchPolygon(payload)` - Find similar roof polygons using ML matching (src/services/geoml-client.ts)

### Geospatial Math Library
- `polyAreaSqm(polygon)` - Calculate polygon area in square meters (src/lib/geo/polygon-core.ts)
- `polyBounds(polygon)` - Get polygon bounding box coordinates (src/lib/geo/polygon-core.ts)  
- `polyCentroid(polygon)` - Calculate polygon geometric centroid (src/lib/geo/polygon-core.ts)
- `polyCreate()`, `polyNormalize()`, `polySimplify()` - Polygon creation and manipulation utilities
- `polyContains()`, `polyIntersects()` - Geometric analysis functions
- `polyWKT()`, `polyFromWKT()` - Well-Known Text format conversion

### API Endpoints (Supabase Edge Functions)
- `POST /ml-poly-embed` - Polygon embedding generation with feature extraction
- `POST /ml-poly-match` - Vector similarity search for polygon matching

### UI Features
- **Interactive Map Drawing**: Click to add polygon vertices, real-time polygon preview
- **Feature Computation**: Live calculation of area, perimeter, centroid, bounds
- **ML Integration**: Embed polygons and find similar roof structures  
- **Match Results**: Display similarity scores and metadata for matching roofs
- **Responsive Design**: Optimized for desktop and mobile interaction

### Usage Flow
1. Click "Start Drawing" to begin polygon creation
2. Click on map to add vertices (minimum 3 required)
3. Click "Finish Polygon" to complete the shape
4. Click "Embed" to generate ML features 
5. Click "Match" to find similar roof polygons
6. Review match results with confidence scores

---

## Data Polygon Mapping (Non-Geo)

**Embedding Space Polygon Analysis & ML Model Coordination**

### Core Geometry Engine
- `centroid(points)` - Calculate polygon centroid (src/lib/data-polygons/core.ts)
- `area(poly)` - Compute polygon area (src/lib/data-polygons/core.ts)
- `convexHull(pts)` - Monotone chain convex hull algorithm (src/lib/data-polygons/core.ts)
- `clip(subject, clipper)` - Sutherland–Hodgman polygon clipping (src/lib/data-polygons/core.ts)
- `intersectArea(a, b)` - Calculate intersection area between polygons (src/lib/data-polygons/core.ts)
- `unionArea(a, b)` - Calculate union area between polygons (src/lib/data-polygons/core.ts)
- `iou(a, b)` - Intersection over Union metric (src/lib/data-polygons/core.ts)
- `jaccard(a, b)` - Jaccard similarity metric (src/lib/data-polygons/core.ts)

### Projection & Dimensionality Reduction
- `pca2d(X)` - Principal Component Analysis for 2D projection (src/lib/data-polygons/projection.ts)

### Services & Orchestration
- `fetchEmbeddings(sources)` - Retrieve embeddings from multiple data sources (src/services/data-polygons.ts)
- `buildDataPolygons(sources)` - Build convex hulls from embedding clusters (src/services/data-polygons.ts)
- `comparePolygons(hulls)` - Compute overlap metrics between data polygons (src/services/data-polygons.ts)

### Event Bus & Messaging
- `publish(event)` - Emit data polygon events (src/lib/orch/data-bus.ts)
- `subscribe(handler)` - Listen for data polygon events (src/lib/orch/data-bus.ts)
- `recordEdge(from, to, summary, data)` - Record inter-model interactions (src/lib/orch/trace.ts)
- `recordMsg(msg)` - Log model-to-model messages (src/lib/orch/trace.ts)
- `getEdges()` - Retrieve interaction history (src/lib/orch/trace.ts)
- `getMsgs()` - Get model message log (src/lib/orch/trace.ts)

### API Endpoints
- `POST /api/datapoly/embeddings` - Returns embeddings per source for polygon building

### UI Components
- `DataPolygonTab` - SVG polygon visualization with overlap metrics and proof of interconnections (src/components/SystemManager/DataPolygonTab.tsx)

### Features
- **Embedding Space Visualization**: Projects high-dimensional model embeddings to 2D using PCA
- **Convex Hull Generation**: Builds polygons around data clusters for each model/database
- **Overlap Metrics**: Computes IoU (Intersection over Union) and Jaccard similarity between model spaces
- **Inter-Model Coordination**: Sequences data sharing between models with event tracking
- **Proof of Interconnections**: Visual proof via SVG rendering, edge traces, and message logs
- **Real-time Updates**: Live timeline showing model interactions and data flow

### Event Types Supported
- `POLY.DATA.BUILT` - Data polygons constructed from embeddings
- `MATCH.DONE` - Overlap analysis completed
- `ERROR` - Error in polygon processing pipeline
- `MSG` - Inter-model message exchange

---

## Inter-Model Orchestration & Proof-of-Interconnections

**Comprehensive ML Model Coordination & Data Flow Visualization**

### Event Bus & Messaging
- `publish(event)` - Emit orchestrator events (src/lib/orch/event-bus.ts)
- `subscribe(handler)` - Listen for orchestrator events (src/lib/orch/event-bus.ts) 
- `setLastPolygon(points)` - Store polygon for cross-tab coordination (src/lib/orch/event-bus.ts)
- `getLastPolygon()` - Retrieve last completed polygon (src/lib/orch/event-bus.ts)

### Trace & Lineage Tracking
- `recordEdge(from, to, summary, data)` - Record model-to-model interactions (src/lib/orch/trace.ts)
- `recordMessage(msg)` - Log inter-model data sharing (src/lib/orch/trace.ts)
- `getEdges()` - Retrieve interaction history (src/lib/orch/trace.ts)
- `getMessages()` - Get model message log (src/lib/orch/trace.ts)
- `clearOrchTrace()` - Reset trace storage (src/lib/orch/trace.ts)

### Orchestration Engine
- `runPolygonIntercoordination(params)` - Execute full ML pipeline coordination (src/services/geoml-orchestrator.ts)
- `fetchTariffsByPostcode(postcode)` - Tariff recommendation integration (src/services/geoml-orchestrator.ts)
- `applyAllRebates(ctx)` - Rebate calculation coordination (src/services/geoml-orchestrator.ts)

### API Endpoints for Trace Inspection
- `GET /api/orch/traces` - Retrieve orchestration traces and messages 
- `POST /api/orch/clear` - Clear orchestration trace history

### UI Components
- `IntercoordinationTab` - Network visualization and live timeline (src/components/SystemManager/IntercoordinationTab.tsx)
- Integration: `PolygonMonitorTab` → `setLastPolygon(points)` on finish

### Proof Elements Rendered
- **Network Graph**: Visual nodes & directional edges showing Polygon → Embedder → VectorIndex → CatalogMatcher, TariffRecommender → ROIEngine, RebateEngine → ROIEngine → SystemManager
- **Live Timeline**: Real-time event logging as orchestration progresses  
- **Model Messages**: Inter-model communication logs (sender, receiver, topic, content, confidence) accessible via /api/orch/traces
- **Cross-Tab Coordination**: Polygon completion in Geo/ML tab automatically feeds Intercoordination tab

### Event Types Supported
- `POLY.FINISHED` - Polygon drawing completion
- `EMBED.DONE` - Vector embedding generation complete
- `MATCH.DONE` - Similarity matching results ready
- `TARIFF.MATCHED` - Tariff plan recommendation complete
- `VPP.MATCHED` - VPP plan matching complete  
- `ROI.CALC.DONE` - ROI calculation finished
- `ERROR` - Error occurred in pipeline

---

# Auto-Discovered Additions (from codebase)

## AI Adapters & Integrations (src/ai/adapters)
- `ai_deepspeed` - DeepSpeed training adapter (src/ai/adapters/ai_deepspeed/index.ts)
- `ai_langgraph_plus` - LangGraph Plus inference adapter (src/ai/adapters/ai_langgraph_plus/index.ts)
- `ai_rllib` - RLlib reinforcement learning adapter (src/ai/adapters/ai_rllib/index.ts)
- `ai_stable_baselines3` - Stable Baselines3 RL adapter (src/ai/adapters/ai_stable_baselines3/index.ts)
- `ai_vllm` - vLLM inference adapter (src/ai/adapters/ai_vllm/index.ts)
- `asr_whispercpp` - Whisper.cpp speech recognition adapter (src/ai/adapters/asr_whispercpp/index.ts)
- `forecast_prophet` - Facebook Prophet forecasting adapter (src/ai/adapters/forecast_prophet/index.ts)
- `forecast_tft` - Temporal Fusion Transformer adapter (src/ai/adapters/forecast_tft/index.ts)
- `llm_llamacpp` - Llama.cpp LLM adapter (src/ai/adapters/llm_llamacpp/index.ts)
- `ml_autosklearn` - AutoML sklearn adapter (src/ai/adapters/ml_autosklearn/index.ts)
- `ml_catboost` - CatBoost ML adapter (src/ai/adapters/ml_catboost/index.ts)
- `ml_keras` - Keras/TensorFlow adapter (src/ai/adapters/ml_keras/index.ts)
- `ml_lightgbm` - LightGBM ML adapter (src/ai/adapters/ml_lightgbm/index.ts)
- `ml_pytorch` - PyTorch ML adapter (src/ai/adapters/ml_pytorch/index.ts)
- `ml_sklearn` - Scikit-learn ML adapter (src/ai/adapters/ml_sklearn/index.ts)
- `ml_xgboost` - XGBoost ML adapter (src/ai/adapters/ml_xgboost/index.ts)
- `nlp_fasttext` - FastText NLP adapter (src/ai/adapters/nlp_fasttext/index.ts)
- `nlp_flair` - Flair NLP adapter (src/ai/adapters/nlp_flair/index.ts)
- `nlp_nltk` - NLTK NLP adapter (src/ai/adapters/nlp_nltk/index.ts)
- `nlp_sentence_transformers` - Sentence Transformers adapter (src/ai/adapters/nlp_sentence_transformers/index.ts)
- `nlp_spacy` - spaCy NLP adapter (src/ai/adapters/nlp_spacy/index.ts)
- `nlp_tokenizers` - Tokenizers adapter (src/ai/adapters/nlp_tokenizers/index.ts)
- `nlp_transformers` - Hugging Face Transformers adapter (src/ai/adapters/nlp_transformers/index.ts)
- `ocr_tesseract` - Tesseract.js OCR adapter (src/ai/adapters/ocr_tesseract/index.ts)
- `opencv_js` - OpenCV.js computer vision adapter (src/ai/adapters/opencv_js/index.ts)
- `optimizer_ortools` - OR-Tools optimization adapter (src/ai/adapters/optimizer_ortools/index.ts)
- `orchestration_langgraph` - LangGraph orchestration adapter (src/ai/adapters/orchestration_langgraph/index.ts)
- `quantum_cirq` - Google Cirq quantum adapter (src/ai/adapters/quantum_cirq/index.ts)
- `quantum_pennylane` - PennyLane quantum ML adapter (src/ai/adapters/quantum_pennylane/index.ts)
- `quantum_qiskit` - IBM Qiskit quantum adapter (src/ai/adapters/quantum_qiskit/index.ts)
- `quantum_strawberry` - Strawberry Fields quantum adapter (src/ai/adapters/quantum_strawberry/index.ts)
- `quantum_tfq` - TensorFlow Quantum adapter (src/ai/adapters/quantum_tfq/index.ts)
- `runtime_onnx` - ONNX Runtime adapter (src/ai/adapters/runtime_onnx/index.ts)
- `vector_faiss` - FAISS vector search adapter (src/ai/adapters/vector_faiss/index.ts)

## Core AI Functions (src/ai)
- `put()`, `get()`, `all()` - Feature store operations (src/ai/featureStore.ts)
- `registerAdapter()`, `listAdapters()` - Adapter registry (src/ai/integrations/registry.ts)
- `publish()`, `subscribe()` - Event bus (src/ai/orchestrator/bus.ts)
- `chooseBest()` - Fusion selector (src/ai/orchestrator/fusion.ts)

## React Components (src/components)
- `AccuracyToggle` (src/components/AccuracyToggle.tsx)
- `AIAssistant` (src/components/AIAssistant.tsx)
- `AppTabs` (src/components/AppTabs.tsx)
- `AutoSiteAnalysis` (src/components/AutoSiteAnalysis.tsx)
- `BatteryROICalculator` (src/components/BatteryROICalculator.tsx)
- `BestRatesStep` (src/components/BestRatesStep.tsx)
- `BillsQuotesOCR` (src/components/BillsQuotesOCR.tsx)
- `ComplianceTab` (src/components/ComplianceTab.tsx)
- `ComplianceTabResilient` (src/components/ComplianceTabResilient.tsx)
- `ComprehensiveCatalogManager` (src/components/ComprehensiveCatalogManager.tsx)
- `ComprehensiveShadeAnalyzer` (src/components/ComprehensiveShadeAnalyzer.tsx)
- `ComprehensiveSiteAnalysis` (src/components/ComprehensiveSiteAnalysis.tsx)
- `ComprehensiveSpecsCompleter` (src/components/ComprehensiveSpecsCompleter.tsx)
- `ComprehensiveTrainingDashboard` (src/components/ComprehensiveTrainingDashboard.tsx)
- `ConfigManagementPanel` (src/components/ConfigManagementPanel.tsx)
- `DataCollectionPanel` (src/components/DataCollectionPanel.tsx)
- `DemoDataDashboard` (src/components/DemoDataDashboard.tsx)
- `EnergyPlanStats` (src/components/EnergyPlanStats.tsx)
- `EnhancedAISystem` (src/components/EnhancedAISystem.tsx)
- `EnhancedOCRScanner` (src/components/EnhancedOCRScanner.tsx)
- `EnhancedSlider` (src/components/EnhancedSlider.tsx)
- `EnhancedTrainingSystem` (src/components/EnhancedTrainingSystem.tsx)
- `FunctionImpactDashboard` (src/components/FunctionImpactDashboard.tsx)
- `FuturisticBanner` (src/components/FuturisticBanner.tsx)
- `Glass` (src/components/Glass.tsx)
- `GlassmorphicChart` (src/components/GlassmorphicChart.tsx)
- `GlobalErrorBoundary` (src/components/GlobalErrorBoundary.tsx)
- `HeroHeader` (src/components/HeroHeader.tsx)
- `HolographicGraph` (src/components/HolographicGraph.tsx)
- `InitialDataLoader` (src/components/InitialDataLoader.tsx)
- `InputModeTabs` (src/components/InputModeTabs.tsx)
- `LimitLine` (src/components/LimitLine.tsx)
- `LiteProToggle` (src/components/LiteProToggle.tsx)
- `LocationAutoFill` (src/components/LocationAutoFill.tsx)
- `MasterTrainingControl` (src/components/MasterTrainingControl.tsx)
- `ModelSelector` (src/components/ModelSelector.tsx)
- `ModelStatusBadge` (src/components/ModelStatusBadge.tsx)
- `MonitoringTab` (src/components/MonitoringTab.tsx)
- `MultitaskTrainingDashboard` (src/components/MultitaskTrainingDashboard.tsx)
- `OCRResultDisplay` (src/components/OCRResultDisplay.tsx)
- `OCRScanner` (src/components/OCRScanner.tsx)
- `OCRToMapDemo` (src/components/OCRToMapDemo.tsx)
- `OneCatalogManager` (src/components/OneCatalogManager.tsx)
- `PDFProposalUploader` (src/components/PDFProposalUploader.tsx)
- `PreBootTrainer` (src/components/PreBootTrainer.tsx)
- `PricingTiers` (src/components/PricingTiers.tsx)
- `ProductPickerEnhanced` (src/components/ProductPickerEnhanced.tsx)
- `ReadinessGateGuard` (src/components/ReadinessGateGuard.tsx)
- `RealSpecsExtractor` (src/components/RealSpecsExtractor.tsx)
- `RebatesCalculator` (src/components/RebatesCalculator.tsx)
- `RefreshEnergyPlansButton` (src/components/RefreshEnergyPlansButton.tsx)
- `ReliableSpecsExtractor` (src/components/ReliableSpecsExtractor.tsx)
- `ResultCards` (src/components/ResultCards.tsx)
- `SavingsAnalysisStep` (src/components/SavingsAnalysisStep.tsx)
- `SavingsCTACard` (src/components/SavingsCTACard.tsx)
- `SavingsWizard` (src/components/SavingsWizard.tsx)
- `ScrapingDashboard` (src/components/ScrapingDashboard.tsx)
- `ScrapingWidget` (src/components/ScrapingWidget.tsx)
- `SEOHead` (src/components/SEOHead.tsx)
- `SiteAnalysisPopup` (src/components/SiteAnalysisPopup.tsx)
- `SiteAnalyzer` (src/components/SiteAnalyzer.tsx)
- `SiteShadingAnalyzer` (src/components/SiteShadingAnalyzer.tsx)
- `SmartConfirmDialog` (src/components/SmartConfirmDialog.tsx)
- `SmartOCRScanner` (src/components/SmartOCRScanner.tsx)
- `SolarCalculator` (src/components/SolarCalculator.tsx)
- `SpecsEnhancementWidget` (src/components/SpecsEnhancementWidget.tsx)
- `SpecsExtractorTest` (src/components/SpecsExtractorTest.tsx)
- `StepBanner` (src/components/StepBanner.tsx)
- `SystemHealthDashboard` (src/components/SystemHealthDashboard.tsx)
- `SystemManagerButton` (src/components/SystemManagerButton.tsx)
- `SystemManagerCard` (src/components/SystemManagerCard.tsx)
- `SystemSizingStep` (src/components/SystemSizingStep.tsx)
- `SystemStatusIndicator` (src/components/SystemStatusIndicator.tsx)
- `TariffVPPOptimizerTab` (src/components/TariffVPPOptimizerTab.tsx)
- `TariffVPPOptimizerTabNew` (src/components/TariffVPPOptimizerTabNew.tsx)
- `TopBar` (src/components/TopBar.tsx)
- `TopThreePlansCard` (src/components/TopThreePlansCard.tsx)
- `TrainingAutomation` (src/components/TrainingAutomation.tsx)
- `TrainingImprovementsDashboard` (src/components/TrainingImprovementsDashboard.tsx)
- `TwinUncertaintyTab` (src/components/TwinUncertaintyTab.tsx)
- `TwinUncertaintyTabNew` (src/components/TwinUncertaintyTabNew.tsx)
- `UniversalOCRScanner` (src/components/UniversalOCRScanner.tsx)
- `WorkingScrapingWidget` (src/components/WorkingScrapingWidget.tsx)

## Data & Energy Functions
- `getBatteriesByBrand()`, `getBatteriesByTier()`, `getBatteriesByVPP()`, `searchBatteries()`, `calculateSystemCapacity()` - Battery operations (src/data/batteryData.ts)
- `getPanelsByBrand()`, `getPanelsByTier()`, `searchPanels()` - Panel operations (src/data/panelData.ts)
- `getStateFromPostcode()` - Geographic operations (src/data/solarData.ts)
- `planToRetailPlan()` - AER plan normalization (src/energy/aerNormalize.ts)
- `calcAnnualCost()`, `rankPlans()` - Plan ranking (src/energy/rankPlans.ts)
- `rateForHour()` - Tariff calculations (src/energy/db.ts)
- `getRetailersByState()`, `getDnspByState()`, `getRetailerByBrand()`, `getPostcodeNetwork()` - Retailer operations (src/energy/comprehensiveRetailers.ts)

## Hooks & State Management
- `useAIOrchestrator()` (src/hooks/useAIOrchestrator.ts)
- `useCECData()` (src/hooks/useCECData.ts)
- `usePlanSelection()` (src/hooks/usePlanSelection.ts)
- `useTrainingImpact()` (src/hooks/useTrainingImpact.ts)
- `useTrainingState()` (src/hooks/useTrainingState.ts)
- `useVPPCompatibility()` (src/hooks/useVPPCompatibility.ts)
- `useModels()` (src/hooks/useModels.ts)

## Utility Functions
- `getDnspByPostcode()`, `getDefaultMeterType()`, `clearDnspCache()`, `getStateFromPostcode()` (src/utils/dnspResolver.ts)
- `calculateBatteryRebates()`, `calculateNetPrice()`, `testRebateCalculation()` (src/utils/rebateCalculations.ts)
- `predict()`, `checkMLServiceHealth()`, `getServiceStatus()` (src/lib/modelClient.ts)
- `formatCurrency()`, `formatPercent()`, `formatNumber()` (src/utils/format.ts)

## Supabase Edge Functions (API Endpoints)
- `ai-document-analyzer` - AI-powered document analysis
- `ai-system-sizing` - AI system sizing optimization
- `catalog-orchestrator` - Product catalog management
- `cec-battery-scraper` - CEC battery data scraper
- `cec-comprehensive-scraper` - Comprehensive CEC scraper
- `cec-panel-scraper` - CEC panel data scraper
- `cec-scrape` - General CEC scraping
- `dnsps-build-all` - DNSP database builder
- `dnsps-import` - DNSP data import
- `dnsps-resolve` - DNSP resolution service
- `energy-plans-scraper` - Energy plan scraping
- `enhanced-web-scraper` - Enhanced web scraping
- `force-complete-scrape` - Force complete scraping
- `force-progress-sync` - Progress synchronization
- `get-product-counts` - Product count service
- `multitask-trainer` - Multi-task training
- `pdf-proposal-processor` - PDF proposal processing
- `plan-comparison` - Energy plan comparison
- `preboot-trainer` - Pre-boot training system
- `product-web-search` - Product web search
- `pv-simulator` - PV system simulation
- `refresh-energy-plans` - Energy plan refresh
- `reliable-specs-extractor` - Specs extraction
- `specs-enhancer` - Specification enhancement
- `tariff-optimizer` - Tariff optimization
- `training-orchestrator` - Training orchestration
- `training-scheduler` - Training scheduling
- `update-cec-data` - CEC data updates
- `vpp-compatibility-checker` - VPP compatibility
- `weekly-data-refresh` - Weekly data refresh

## Database Tables (from migrations)
- `cec_panels` - CEC approved panels
- `cec_batteries` - CEC approved batteries  
- `cec_inverters` - CEC approved inverters
- `vpp_providers` - VPP provider data
- `battery_vpp_compatibility` - Battery-VPP compatibility
- `cec_data_refresh_log` - CEC refresh logging
- `postcode_zones` - Solar postcode zones
- `refresh_log` - General refresh logging
- `pv_modules` - PV module catalog
- `batteries` - Battery catalog
- `product_changes` - Product change tracking
- `data_update_tracking` - Data update logs
- `doc_spans` - Document span data
- `ui_constraints` - UI constraint data
- `train_episodes` - Training episodes
- `replay_items` - Training replay data
- `training_metrics` - Training metrics
- `manufacturers` - Manufacturer data
- `products` - Product catalog
- `specs` - Product specifications
- `compat` - Compatibility data
- `metrics` - System metrics
- `scrape_progress` - Scraping progress
- `readiness_gates` - System readiness gates
- `proposal_guidelines` - Proposal guidelines
- `training_standards` - Training standards
- `training_sessions` - Training sessions
- `training_stage_results` - Training stage results
- `npu_builds` - NPU build data
- `model_configs` - Model configurations
- `dataset_splits` - Dataset splits
- `orchestrator_sessions` - Orchestrator sessions
- `orchestrator_progress` - Orchestrator progress
- `ai_model_weights` - AI model weights
- `energy_plans` - Energy plan data
- `plan_scores` - Plan scoring data
- `dnsps` - DNSP data
- `scrape_jobs` - Scraping job data
- `scrape_job_progress` - Job progress tracking

## Types & Interfaces
- `WithMeta`, `TouWindow`, `RetailPlan`, `BillFields`, `LoadShape`, `DispatchResult`, `RoiResult` (src/ai/orchestrator/contracts.ts)
- `BatterySpec`, `PanelSpec` (src/data/batteryData.ts, src/data/panelData.ts)
- `SolarZoneData`, `BatteryRebateRule`, `VppIncentiveRule` (src/data/solarData.ts)
- `RetailerBrand`, `SupportedState` (src/energy/aerRetailers.ts)
- `RetailerInfo`, `AllSupportedState` (src/energy/comprehensiveRetailers.ts)
- `RankContext` (src/energy/rankPlans.ts)
- `IngestOptions`, `IngestResult` (src/energy/ingest.ts)
- `AIOrchestrator` (src/hooks/useAIOrchestrator.ts)
- `CECPanel`, `CECBattery`, `VPPProvider` (src/hooks/useCECData.ts)

## Constants & Configuration
- `BATTERY_SYSTEMS`, `BATTERY_BRANDS` (src/data/batteryData.ts)
- `SOLAR_PANELS`, `PANEL_BRANDS` (src/data/panelData.ts)
- `ZONE_MULTIPLIERS`, `POSTCODE_ZONES`, `STATE_DEFAULT_ZONES`, `BATTERY_REBATES`, `VPP_INCENTIVES` (src/data/solarData.ts)
- `AER_RETAILERS`, `SUPPORTED_STATES` (src/energy/aerRetailers.ts)
- `MAJOR_RETAILERS`, `CDR_RETAILERS`, `DNSP_BY_STATE`, `ALL_SUPPORTED_STATES` (src/energy/comprehensiveRetailers.ts)
- `APPROVED_PANEL_BRANDS`, `APPROVED_BATTERY_BRANDS` (src/utils/approvedBrands.ts)
- `FACTOR_BY_YEAR`, `DEFAULT_STC_SPOT_PRICE`, `BATTERY_LIMITS`, `NSW_VPP_TIERS` (src/utils/rebateCalculations.ts)

---

## How This README Stays Current

This README is automatically maintained as the **single source of truth** for the ROI Calculator app. 

### Updating the Index

To regenerate this README with the latest codebase changes:

```bash
npm run readme:gen
```

### What Gets Scanned

The generator automatically scans:
- **Functions**: `export function`, `export const fn = () =>`
- **Components**: React components with `export default`
- **Types**: `export interface`, `export type` 
- **Constants**: `export const` (uppercase naming patterns)
- **Supabase Functions**: Folder names under `supabase/functions/`
- **Database Tables**: `CREATE TABLE` statements in migrations
- **Hooks**: Custom React hooks starting with `use`

### Maintenance Rules

- ✅ **APPEND ONLY**: New items are always added under existing headings
- ❌ **NEVER REMOVES**: Original Master Index items are never deleted or renamed
- 📁 **FILE PATHS**: All auto-discovered items include their source file path
- 🔄 **ALWAYS CURRENT**: Run the generator after adding new functions/components

### Contributing

When adding new code:
1. Use clear, descriptive function/component names
2. Follow existing naming conventions
3. Run `npm run readme:gen` before committing
4. The README will automatically discover and index your additions

This ensures the README always reflects the complete, current state of the application.