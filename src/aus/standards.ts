export function warnInverter4777(invKw: number): string | null {
  if (invKw > 30) {
    return "⚠️ Check AS/NZS 4777.1 limits for LV connection";
  }
  return null;
}

export function hintBattery5139(clearances: {
  top: number;
  side: number;
  front: number;
}): string | null {
  const { top, side, front } = clearances;
  
  if (top < 600 || side < 600 || front < 1000) {
    return "📋 Verify AS/NZS 5139 clearance requirements";
  }
  
  return null;
}

export function stcDeemingYears(aestDate: Date): number {
  // STC deeming period calculation for Australian solar certificates
  const currentYear = aestDate.getFullYear();
  const endYear = 2030; // Current STC scheme end date
  
  return Math.max(1, endYear - currentYear + 1);
}

export function checkSafetySwitch(): string {
  return "💡 Ensure RCD/safety switch compliance per AS/NZS 3000";
}

export function checkMeterUpgrade(systemKw: number): string | null {
  if (systemKw > 5) {
    return "📊 System >5kW may require meter upgrade - check with DNSP";
  }
  return null;
}