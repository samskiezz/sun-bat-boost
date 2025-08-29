/**
 * Approved solar panel and battery brands for recommendations
 */

export const APPROVED_PANEL_BRANDS = [
  'REC',
  'AIKO', 
  'LONGI',
  'JINKO',
  'TINDO'
];

export const APPROVED_BATTERY_BRANDS = [
  'SIGENERGY',
  'SUNGROW', 
  'GOODWE',
  'FOX ESS',
  'TESLA'
];

/**
 * Filter products to only include approved brands
 */
export function filterApprovedPanels<T extends { brand: string }>(panels: T[]): T[] {
  return panels.filter(panel => 
    APPROVED_PANEL_BRANDS.some(approved => 
      panel.brand.toLowerCase().includes(approved.toLowerCase()) ||
      approved.toLowerCase().includes(panel.brand.toLowerCase())
    )
  );
}

export function filterApprovedBatteries<T extends { brand: string }>(batteries: T[]): T[] {
  return batteries.filter(battery => 
    APPROVED_BATTERY_BRANDS.some(approved => 
      battery.brand.toLowerCase().includes(approved.toLowerCase()) ||
      approved.toLowerCase().includes(battery.brand.toLowerCase())
    )
  );
}

/**
 * Find the first approved panel from a list, or return null
 */
export function findApprovedPanel<T extends { brand: string }>(panels: T[]): T | null {
  const approved = filterApprovedPanels(panels);
  return approved.length > 0 ? approved[0] : null;
}

/**
 * Find the first approved battery from a list, or return null
 */
export function findApprovedBattery<T extends { brand: string }>(batteries: T[]): T | null {
  const approved = filterApprovedBatteries(batteries);
  return approved.length > 0 ? approved[0] : null;
}