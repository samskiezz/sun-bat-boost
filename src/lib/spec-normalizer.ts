interface SpecNormalizationRule {
  patterns: string[];
  key: string;
  unit?: string;
  transform?: (value: string) => string;
}

interface SpecKeyMapping {
  [category: string]: SpecNormalizationRule[];
}

export class SpecNormalizer {
  private readonly keyMappings: SpecKeyMapping = {
    PANEL: [
      {
        patterns: [
          'maximum power', 'max power', 'pmax', 'power rating', 'rated power',
          'nominal power', 'power output', 'wp', 'watt peak'
        ],
        key: 'panel.power_w',
        unit: 'W'
      },
      {
        patterns: [
          'efficiency', 'module efficiency', 'cell efficiency', 'eff',
          'conversion efficiency', 'solar efficiency'
        ],
        key: 'panel.eff_pct',
        unit: '%'
      },
      {
        patterns: [
          'open circuit voltage', 'voc', 'v oc', 'open-circuit voltage',
          'voltage open circuit', 'oc voltage'
        ],
        key: 'panel.voc_v',
        unit: 'V'
      },
      {
        patterns: [
          'voltage at maximum power', 'vmp', 'v mp', 'vmpp', 'voltage mpp',
          'maximum power voltage', 'optimum voltage'
        ],
        key: 'panel.vmp_v',
        unit: 'V'
      },
      {
        patterns: [
          'short circuit current', 'isc', 'i sc', 'short-circuit current',
          'current short circuit', 'sc current'
        ],
        key: 'panel.isc_a',
        unit: 'A'
      },
      {
        patterns: [
          'current at maximum power', 'imp', 'i mp', 'impp', 'current mpp',
          'maximum power current', 'optimum current'
        ],
        key: 'panel.imp_a',
        unit: 'A'
      },
      {
        patterns: [
          'temperature coefficient', 'temp coeff', 'tc voc', 'voc temp coeff',
          'voltage temperature coefficient', 'temperature coefficient of voc'
        ],
        key: 'panel.temp_coeff_voc_pct_c',
        unit: '%/°C'
      },
      {
        patterns: [
          'dimensions', 'size', 'length', 'module length', 'height'
        ],
        key: 'panel.dim_h_mm',
        unit: 'mm'
      },
      {
        patterns: [
          'width', 'module width'
        ],
        key: 'panel.dim_w_mm',
        unit: 'mm'
      },
      {
        patterns: [
          'weight', 'mass', 'module weight'
        ],
        key: 'panel.weight_kg',
        unit: 'kg'
      }
    ],

    INVERTER: [
      {
        patterns: [
          'ac power', 'ac output', 'rated ac power', 'nominal ac power',
          'continuous ac power', 'ac rating', 'output power'
        ],
        key: 'inv.ac_kw',
        unit: 'kW'
      },
      {
        patterns: [
          'dc power', 'max dc power', 'maximum dc power', 'dc input power',
          'pv input power', 'solar input'
        ],
        key: 'inv.dc_max_kw',
        unit: 'kW'
      },
      {
        patterns: [
          'phase', 'phases', 'single phase', 'three phase', '1-phase', '3-phase'
        ],
        key: 'inv.phase',
        transform: (value) => {
          const v = value.toLowerCase();
          if (v.includes('single') || v.includes('1')) return '1';
          if (v.includes('three') || v.includes('3')) return '3';
          return value;
        }
      },
      {
        patterns: [
          'mppt voltage range', 'mppt range', 'pv voltage range',
          'dc voltage range', 'input voltage range', 'mppt window'
        ],
        key: 'inv.mppt_min_v',
        unit: 'V'
      },
      {
        patterns: [
          'battery voltage', 'battery voltage range', 'dc battery voltage',
          'backup voltage', 'storage voltage'
        ],
        key: 'inv.vbat_min_v',
        unit: 'V'
      },
      {
        patterns: [
          'backup power', 'ups power', 'emergency power', 'battery power',
          'backup rating', 'standby power'
        ],
        key: 'inv.backup_kw',
        unit: 'kW'
      },
      {
        patterns: [
          'strings', 'pv strings', 'mppt trackers', 'string inputs',
          'dc inputs', 'pv inputs'
        ],
        key: 'inv.strings'
      }
    ],

    BATTERY_MODULE: [
      {
        patterns: [
          'capacity', 'energy capacity', 'usable capacity', 'nominal capacity',
          'energy', 'kwh', 'wh', 'battery capacity'
        ],
        key: 'bat.module_kwh',
        unit: 'kWh'
      },
      {
        patterns: [
          'chemistry', 'cell chemistry', 'battery chemistry', 'cell type',
          'technology', 'lithium', 'lifepo4', 'nmc', 'lto'
        ],
        key: 'bat.cell_chem'
      },
      {
        patterns: [
          'voltage', 'nominal voltage', 'rated voltage', 'battery voltage',
          'dc voltage', 'system voltage'
        ],
        key: 'bat.nom_v',
        unit: 'V'
      },
      {
        patterns: [
          'minimum voltage', 'min voltage', 'cutoff voltage', 'low voltage',
          'discharge voltage', 'end voltage'
        ],
        key: 'bat.v_min',
        unit: 'V'
      },
      {
        patterns: [
          'maximum voltage', 'max voltage', 'peak voltage', 'high voltage',
          'charge voltage', 'full voltage'
        ],
        key: 'bat.v_max',
        unit: 'V'
      },
      {
        patterns: [
          'current', 'nominal current', 'rated current', 'continuous current',
          'max continuous current'
        ],
        key: 'bat.nom_a',
        unit: 'A'
      },
      {
        patterns: [
          'peak current', 'max current', 'maximum current', 'surge current',
          'instantaneous current'
        ],
        key: 'bat.max_a',
        unit: 'A'
      },
      {
        patterns: [
          'modules in series', 'series modules', 'min modules', 'minimum modules',
          'stack size', 'series connection'
        ],
        key: 'bat.min_n'
      },
      {
        patterns: [
          'max modules', 'maximum modules', 'max series', 'maximum series',
          'max stack', 'series limit'
        ],
        key: 'bat.max_n'
      }
    ]
  };

  normalizeSpecKV(raw: string, category: string): { key?: string; value?: string; unit?: string } | null {
    const rules = this.keyMappings[category];
    if (!rules) return null;

    const cleanRaw = this.cleanText(raw);
    const lowerRaw = cleanRaw.toLowerCase();

    for (const rule of rules) {
      for (const pattern of rule.patterns) {
        if (lowerRaw.includes(pattern.toLowerCase())) {
          const extracted = this.extractValue(cleanRaw, pattern);
          if (extracted.value) {
            let finalValue = extracted.value;
            
            // Apply transformation if specified
            if (rule.transform) {
              finalValue = rule.transform(finalValue);
            }

            return {
              key: rule.key,
              value: finalValue,
              unit: extracted.unit || rule.unit
            };
          }
        }
      }
    }

    return null;
  }

  private extractValue(text: string, pattern: string): { value?: string; unit?: string } {
    // Remove the pattern from text to find the value
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const remaining = text.replace(regex, '').trim();

    // Look for number patterns with optional units
    const valuePatterns = [
      // Number with unit: "5.2 kW", "480 V", "15.5%"
      /(\d+\.?\d*)\s*([a-zA-Z%°/]+)/g,
      // Range: "120-600V", "4.5~8.2 kWh"
      /(\d+\.?\d*)\s*[-~to]\s*(\d+\.?\d*)\s*([a-zA-Z%°/]+)/g,
      // Just number: "5.2", "480"
      /(\d+\.?\d*)/g
    ];

    for (const pattern of valuePatterns) {
      const matches = Array.from(remaining.matchAll(pattern));
      if (matches.length > 0) {
        const match = matches[0];
        
        if (match.length === 4) {
          // Range pattern
          return {
            value: `${match[1]}-${match[2]}`,
            unit: match[3]
          };
        } else if (match.length === 3) {
          // Number with unit
          return {
            value: match[1],
            unit: match[2]
          };
        } else if (match.length === 2) {
          // Just number
          return {
            value: match[1]
          };
        }
      }
    }

    return {};
  }

  parseRange(s: string): { min?: number; max?: number } | null {
    if (!s) return null;

    // Handle various range formats
    const rangePatterns = [
      /(\d+\.?\d*)\s*[-~to]\s*(\d+\.?\d*)/i,
      /(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/i,
      /(\d+\.?\d*)\s*…\s*(\d+\.?\d*)/i
    ];

    for (const pattern of rangePatterns) {
      const match = s.match(pattern);
      if (match) {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        if (!isNaN(min) && !isNaN(max)) {
          return { min, max };
        }
      }
    }

    // Single value
    const singleMatch = s.match(/(\d+\.?\d*)/);
    if (singleMatch) {
      const value = parseFloat(singleMatch[1]);
      if (!isNaN(value)) {
        return { min: value, max: value };
      }
    }

    return null;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\d.,%-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Expand aliases for brand names
  expandBrandAliases(brand: string): string[] {
    const aliases: Record<string, string[]> = {
      'Tesla': ['tesla', 'tesla energy', 'tesla motors'],
      'Fronius': ['fronius', 'fronius international'],
      'SMA': ['sma', 'sma solar', 'sma solar technology'],
      'Enphase': ['enphase', 'enphase energy'],
      'Trina': ['trina', 'trina solar', 'trinasolar'],
      'Jinko': ['jinko', 'jinko solar', 'jinkosolar'],
      'Canadian Solar': ['canadian solar', 'canadian', 'cs', 'csun'],
      'LONGi': ['longi', 'longi solar', 'longi green energy'],
      'JA Solar': ['ja solar', 'ja', 'jasolar'],
      'Huawei': ['huawei', 'huawei technologies'],
      'GoodWe': ['goodwe', 'goodwe technologies'],
      'Solis': ['solis', 'solis energy'],
      'BYD': ['byd', 'byd company', 'byd battery'],
      'Alpha ESS': ['alpha ess', 'alpha', 'alpha-ess'],
      'Pylontech': ['pylontech', 'pylon technologies']
    };

    const lowerBrand = brand.toLowerCase();
    
    for (const [canonical, variants] of Object.entries(aliases)) {
      if (variants.some(variant => lowerBrand.includes(variant))) {
        return [canonical, ...variants];
      }
    }

    return [brand, brand.toLowerCase()];
  }

  // Normalize unit variations
  normalizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      'w': 'W',
      'watts': 'W',
      'watt': 'W',
      'kw': 'kW',
      'kilowatt': 'kW',
      'kilowatts': 'kW',
      'kwh': 'kWh',
      'kw-h': 'kWh',
      'kw·h': 'kWh',
      'wh': 'Wh',
      'watthour': 'Wh',
      'watthours': 'Wh',
      'v': 'V',
      'volt': 'V',
      'volts': 'V',
      'a': 'A',
      'amp': 'A',
      'amps': 'A',
      'ampere': 'A',
      'amperes': 'A',
      '%': '%',
      'percent': '%',
      'percentage': '%',
      '°c': '°C',
      'celsius': '°C',
      'c': '°C',
      'mm': 'mm',
      'millimeter': 'mm',
      'millimeters': 'mm',
      'cm': 'cm',
      'centimeter': 'cm',
      'centimeters': 'cm',
      'kg': 'kg',
      'kilogram': 'kg',
      'kilograms': 'kg'
    };

    return unitMap[unit.toLowerCase()] || unit;
  }
}