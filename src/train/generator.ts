import { SiteContext, ProductBasket } from './types';

// Australian postcode data for realistic generation
const AUSTRALIAN_POSTCODES = [
  { postcode: '2000', state: 'NSW', tempMin: 8 },
  { postcode: '3000', state: 'VIC', tempMin: 6 },
  { postcode: '4000', state: 'QLD', tempMin: 12 },
  { postcode: '5000', state: 'SA', tempMin: 7 },
  { postcode: '6000', state: 'WA', tempMin: 9 },
  { postcode: '7000', state: 'TAS', tempMin: 4 },
  { postcode: '0800', state: 'NT', tempMin: 18 },
  { postcode: '2600', state: 'ACT', tempMin: 3 },
];

const COMMON_PANEL_IDS = [
  'trina-vertex-s-400w',
  'jinko-tiger-neo-420w',
  'canadian-solar-hiku6-450w',
  'longi-hi-mo-6-430w',
  'ja-solar-deep-blue-4-440w'
];

const COMMON_INVERTER_IDS = [
  'fronius-primo-5kw',
  'sma-sunny-boy-5kw',
  'goodwe-gw5000-ems',
  'huawei-sun2000-5ktl',
  'solis-5g-5kw'
];

const COMMON_BATTERY_IDS = [
  'tesla-powerwall-2',
  'byd-battery-box-premium-hvs',
  'alpha-ess-smile-5',
  'pylontech-us3000c',
  'enphase-encharge-10'
];

export function randomSite(): SiteContext {
  const location = AUSTRALIAN_POSTCODES[Math.floor(Math.random() * AUSTRALIAN_POSTCODES.length)];
  
  return {
    phase: Math.random() > 0.7 ? '3P' : '1P',
    tempMinC: location.tempMin + (Math.random() - 0.5) * 6,
    roofTilt: 15 + Math.random() * 30, // 15-45 degrees
    roofAzimuth: 90 + (Math.random() - 0.5) * 180, // East to West bias
    loadDayKwh: 15 + Math.random() * 25, // 15-40 kWh
    loadNightKwh: 8 + Math.random() * 12, // 8-20 kWh
    exportRule: ['UNLIMITED', 'LIMITED', 'ZERO'][Math.floor(Math.random() * 3)] as any,
    postcode: location.postcode,
    state: location.state,
  };
}

export function randomBasket(): ProductBasket {
  return {
    panelId: COMMON_PANEL_IDS[Math.floor(Math.random() * COMMON_PANEL_IDS.length)],
    inverterId: COMMON_INVERTER_IDS[Math.floor(Math.random() * COMMON_INVERTER_IDS.length)],
    moduleId: Math.random() > 0.4 ? COMMON_BATTERY_IDS[Math.floor(Math.random() * COMMON_BATTERY_IDS.length)] : undefined,
    qty: Math.floor(8 + Math.random() * 24), // 8-32 panels
  };
}

export function randomSyntheticSite(): SiteContext {
  // Generate edge cases for robust training
  const isEdgeCase = Math.random() > 0.8;
  
  if (isEdgeCase) {
    return {
      phase: '3P',
      tempMinC: Math.random() > 0.5 ? -5 : 50, // Extreme temperatures
      roofTilt: Math.random() > 0.5 ? 5 : 60, // Very flat or steep
      roofAzimuth: Math.random() * 360, // Any direction
      loadDayKwh: Math.random() > 0.5 ? 5 : 80, // Very low or high usage
      loadNightKwh: Math.random() > 0.5 ? 2 : 40,
      exportRule: 'ZERO', // Most restrictive
      postcode: '9999', // Edge case postcode
      state: 'NSW',
    };
  }
  
  return randomSite();
}

export function generateRealisticStringSizes(panelCount: number): number[] {
  // Generate realistic string configurations
  const maxStringSize = 24;
  const minStringSize = 8;
  
  const strings = [];
  let remaining = panelCount;
  
  while (remaining > 0) {
    const stringSize = Math.min(
      maxStringSize,
      Math.max(minStringSize, remaining)
    );
    strings.push(stringSize);
    remaining -= stringSize;
  }
  
  return strings;
}

export function generateBatteryStackOptions(batteryKwh: number): Array<{ modules: number; moduleKwh: number }> {
  const commonModuleSizes = [2.56, 5.0, 5.12, 6.5, 10.0, 13.5]; // Common battery module sizes
  
  return commonModuleSizes
    .filter(moduleSize => batteryKwh >= moduleSize)
    .map(moduleSize => ({
      modules: Math.round(batteryKwh / moduleSize),
      moduleKwh: moduleSize
    }))
    .filter(config => config.modules <= 16); // Practical stack limit
}