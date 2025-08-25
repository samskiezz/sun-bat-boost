export interface RebateInputs {
  install_date: string; // ISO date
  state_or_territory: string;
  has_rooftop_solar: boolean;
  battery: {
    usable_kWh: number;
    vpp_capable: boolean;
    battery_on_approved_list: boolean;
  };
  nmi?: string;
  retailer_or_acp?: string;
  dns_provider?: 'Synergy' | 'Horizon';
  household_income?: number;
  stc_spot_price?: number;
  joins_vpp?: boolean;
}

export interface RebateResult {
  federal_discount: number;
  state_rebate: number;
  vpp_bonus: number;
  nt_grant: number;
  total_cash_incentive: number;
  financing_options: FinancingOption[];
  eligibility_notes: string[];
}

export interface FinancingOption {
  type: 'loan';
  provider: string;
  amount: number;
  rate: number;
  term_years: number;
  description: string;
}

// Configurable constants
const FACTOR_BY_YEAR: Record<number, number> = {
  2025: 9.3,
  2026: 8.4,
  2027: 7.4,
  2028: 6.5,
  2029: 5.6,
  2030: 4.7
};

const DEFAULT_STC_SPOT_PRICE = 40.0; // AUD per STC

// NSW VPP tier structure (configurable)
const NSW_VPP_TIERS = [
  { min: 0, max: 10, amount: 550 },
  { min: 10, max: 20, amount: 1100 },
  { min: 20, max: Infinity, amount: 1500 }
];

// WA rates (configurable)
const WA_RATE_PER_KWH = 1000; // Base rate per kWh
const WA_SYNERGY_CAP = 5000;
const WA_HORIZON_CAP = 7500;

// NT rates (configurable)
const NT_RATE_PER_KWH = 800; // Base rate per kWh
const NT_MAX_GRANT = 12000;
const NT_SCHEME_ACTIVE = true; // Toggle for funding windows

export function calculateBatteryRebates(inputs: RebateInputs): RebateResult {
  const {
    install_date,
    state_or_territory,
    has_rooftop_solar,
    battery,
    dns_provider,
    household_income,
    stc_spot_price = DEFAULT_STC_SPOT_PRICE,
    joins_vpp = false
  } = inputs;

  const install_year = new Date(install_date).getFullYear();
  const install_date_obj = new Date(install_date);
  const federal_start_date = new Date('2025-07-01');

  let federal_discount = 0;
  let state_rebate = 0;
  let vpp_bonus = 0;
  let nt_grant = 0;
  const financing_options: FinancingOption[] = [];
  const eligibility_notes: string[] = [];

  // 1. Federal Battery Discount (STC Program)
  if (install_date_obj >= federal_start_date && 
      has_rooftop_solar && 
      battery.battery_on_approved_list) {
    
    const factor = FACTOR_BY_YEAR[install_year];
    if (factor) {
      const battery_STCs_raw = battery.usable_kWh * factor;
      const battery_STCs = Math.floor(battery_STCs_raw);
      federal_discount = battery_STCs * stc_spot_price;
      eligibility_notes.push(`Federal STC discount: ${battery_STCs} STCs × $${stc_spot_price} = $${federal_discount.toFixed(2)}`);
    } else {
      eligibility_notes.push('Federal STC program not available for install year');
    }
  } else {
    if (install_date_obj < federal_start_date) {
      eligibility_notes.push('Federal battery program starts July 1, 2025');
    }
    if (!has_rooftop_solar) {
      eligibility_notes.push('Federal program requires rooftop solar installation');
    }
    if (!battery.battery_on_approved_list) {
      eligibility_notes.push('Battery must be on approved list for federal discount');
    }
  }

  // 2. State-specific rebates and incentives
  switch (state_or_territory.toUpperCase()) {
    case 'NSW':
      // NSW PDRS battery discount suspended from 30 Jun 2025
      if (install_date_obj < new Date('2025-07-01')) {
        eligibility_notes.push('NSW PDRS battery discount ended June 30, 2025');
      }

      // NSW VPP signup incentive (available from 2025-07-01)
      if (install_date_obj >= federal_start_date && battery.vpp_capable && joins_vpp) {
        const tier = NSW_VPP_TIERS.find(t => battery.usable_kWh >= t.min && battery.usable_kWh < t.max);
        if (tier) {
          vpp_bonus = tier.amount;
          eligibility_notes.push(`NSW VPP bonus: $${vpp_bonus} for ${battery.usable_kWh}kWh battery`);
        }
      } else if (!joins_vpp && battery.vpp_capable) {
        eligibility_notes.push('NSW VPP bonus available if you join a Virtual Power Plant');
      }
      break;

    case 'WA':
      // WA Residential Battery Scheme (from 2025-07-01)
      if (install_date_obj >= federal_start_date && battery.vpp_capable && joins_vpp) {
        const cap = dns_provider === 'Synergy' ? WA_SYNERGY_CAP : WA_HORIZON_CAP;
        state_rebate = Math.min(battery.usable_kWh * WA_RATE_PER_KWH, cap);
        eligibility_notes.push(`WA battery rebate: $${state_rebate} (${dns_provider || 'provider'} area)`);
      } else if (!joins_vpp && battery.vpp_capable) {
        eligibility_notes.push('WA rebate requires VPP participation');
      }

      // WA no-interest loans
      if (household_income && household_income <= 210000) {
        financing_options.push({
          type: 'loan',
          provider: 'WA Government',
          amount: 10000,
          rate: 0,
          term_years: 10,
          description: 'No-interest loan up to $10,000 for eligible households'
        });
      }
      break;

    case 'VIC':
      eligibility_notes.push('Victoria now relies on federal battery program only');
      break;

    case 'QLD':
      eligibility_notes.push('QLD Battery Booster program closed May 8, 2024. Federal program available.');
      break;

    case 'SA':
      eligibility_notes.push('No current SA state battery rebate. Federal program available.');
      break;

    case 'ACT':
      // ACT Sustainable Household Scheme - 3% loans from 2025-07-01
      if (install_date_obj >= federal_start_date) {
        financing_options.push({
          type: 'loan',
          provider: 'ACT Government',
          amount: 15000,
          rate: 0.03,
          term_years: 10,
          description: 'Low-interest loan (3% p.a.) up to $15,000'
        });
      }
      break;

    case 'TAS':
      // Tasmania Energy Saver Loan Scheme
      financing_options.push({
        type: 'loan',
        provider: 'Tasmanian Government',
        amount: 10000,
        rate: 0,
        term_years: 10,
        description: 'Interest-free loan up to $10,000'
      });
      break;

    case 'NT':
      // NT Home and Business Battery Scheme
      if (NT_SCHEME_ACTIVE) {
        nt_grant = Math.min(battery.usable_kWh * NT_RATE_PER_KWH, NT_MAX_GRANT);
        eligibility_notes.push(`NT battery grant: $${nt_grant} (subject to funding availability)`);
      } else {
        eligibility_notes.push('NT battery scheme currently not active');
      }
      break;

    default:
      eligibility_notes.push('State/territory not recognized for rebate calculations');
  }

  // Calculate total cash incentive
  const total_cash_incentive = federal_discount + state_rebate + vpp_bonus + nt_grant;

  return {
    federal_discount,
    state_rebate,
    vpp_bonus,
    nt_grant,
    total_cash_incentive,
    financing_options,
    eligibility_notes
  };
}

export function calculateNetPrice(quoted_price: number, rebates: RebateResult): number {
  return Math.max(0, quoted_price - rebates.total_cash_incentive);
}

// Helper function to get state from postcode (if needed)
export function getStateFromPostcode(postcode: number): string {
  // This would typically use the postcode_zones table
  // For now, return a mapping based on postcode ranges
  if (postcode >= 1000 && postcode <= 2999) return 'NSW';
  if (postcode >= 3000 && postcode <= 3999) return 'VIC';
  if (postcode >= 4000 && postcode <= 4999) return 'QLD';
  if (postcode >= 5000 && postcode <= 5999) return 'SA';
  if (postcode >= 6000 && postcode <= 6999) return 'WA';
  if (postcode >= 7000 && postcode <= 7999) return 'TAS';
  if (postcode >= 800 && postcode <= 999) return 'NT';
  if (postcode >= 200 && postcode <= 299) return 'ACT';
  return 'Unknown';
}

// Worked example test function
export function testRebateCalculation(): RebateResult {
  const testInputs: RebateInputs = {
    install_date: '2025-08-25',
    state_or_territory: 'NSW',
    has_rooftop_solar: true,
    battery: {
      usable_kWh: 13.5,
      vpp_capable: true,
      battery_on_approved_list: true
    },
    stc_spot_price: 38.50,
    joins_vpp: true
  };

  return calculateBatteryRebates(testInputs);
}