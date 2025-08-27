// Data Quality Firewall - Declarative validation rules and anomaly detection

import { messageBus } from './MessageBus';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: (data: any) => boolean;
  message: (data: any) => string;
}

export interface FirewallViolation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  data: any;
  timestamp: number;
}

export class DataFirewall {
  private rules: Map<string, ValidationRule> = new Map();
  private violations: FirewallViolation[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.initializeRules();
    this.subscribeToBus();
  }

  private initializeRules() {
    const rules: ValidationRule[] = [
      // Unit validation rules
      {
        id: 'valid_kwh_range',
        name: 'Valid kWh Range',
        description: 'Energy consumption should be within reasonable bounds',
        severity: 'error',
        validate: (data) => {
          if (data.kwh !== undefined) {
            return data.kwh >= 0 && data.kwh <= 100000; // 0-100,000 kWh annually
          }
          return true;
        },
        message: (data) => `kWh value ${data.kwh} is outside valid range (0-100,000)`
      },
      
      {
        id: 'valid_kw_range',
        name: 'Valid kW Range',
        description: 'Power ratings should be within reasonable bounds',
        severity: 'error',
        validate: (data) => {
          if (data.kw !== undefined) {
            return data.kw >= 0 && data.kw <= 1000; // 0-1000 kW system size
          }
          return true;
        },
        message: (data) => `kW value ${data.kw} is outside valid range (0-1000)`
      },

      // GST consistency rules
      {
        id: 'gst_consistency',
        name: 'GST Consistency',
        description: 'Prices should be consistently inc/ex GST',
        severity: 'warning',
        validate: (data) => {
          if (data.price_inc_gst && data.price_ex_gst) {
            const expectedIncGST = data.price_ex_gst * 1.1;
            const diff = Math.abs(data.price_inc_gst - expectedIncGST);
            return diff < 0.01; // Allow 1 cent rounding difference
          }
          return true;
        },
        message: (data) => `GST calculation inconsistent: ${data.price_ex_gst} * 1.1 ≠ ${data.price_inc_gst}`
      },

      // TOU window validation
      {
        id: 'tou_coverage',
        name: 'TOU Coverage',
        description: 'Time-of-use windows should cover 24 hours',
        severity: 'error',
        validate: (data) => {
          if (data.tou_windows && Array.isArray(data.tou_windows)) {
            const totalMinutes = data.tou_windows.reduce((sum: number, window: any) => {
              if (window.start_time && window.end_time) {
                // Simple validation - in production would handle overnight periods
                const start = this.timeToMinutes(window.start_time);
                const end = this.timeToMinutes(window.end_time);
                return sum + (end > start ? end - start : (1440 - start) + end);
              }
              return sum;
            }, 0);
            return Math.abs(totalMinutes - 1440) < 60; // Allow 1 hour tolerance
          }
          return true;
        },
        message: (data) => `TOU windows don't cover 24 hours: ${data.tou_windows?.length} windows`
      },

      // No overlap validation
      {
        id: 'tou_no_overlap',
        name: 'TOU No Overlap',
        description: 'Time-of-use windows should not overlap',
        severity: 'error',
        validate: (data) => {
          if (data.tou_windows && Array.isArray(data.tou_windows) && data.tou_windows.length > 1) {
            // Simplified overlap check - production would be more sophisticated
            const sortedWindows = data.tou_windows
              .map((w: any) => ({
                start: this.timeToMinutes(w.start_time), 
                end: this.timeToMinutes(w.end_time)
              }))
              .sort((a, b) => a.start - b.start);
            
            for (let i = 0; i < sortedWindows.length - 1; i++) {
              if (sortedWindows[i].end > sortedWindows[i + 1].start) {
                return false;
              }
            }
          }
          return true;
        },
        message: () => 'TOU windows have overlapping time periods'
      },

      // Export limit validation
      {
        id: 'export_limit_bounds',
        name: 'Export Limit Bounds',
        description: 'Export limits should be within DNSP ranges',
        severity: 'warning',
        validate: (data) => {
          if (data.export_limit_kw !== undefined) {
            return data.export_limit_kw >= 0 && data.export_limit_kw <= 30; // Typical DNSP range
          }
          return true;
        },
        message: (data) => `Export limit ${data.export_limit_kw}kW outside typical DNSP range (0-30kW)`
      },

      // Rate validation
      {
        id: 'reasonable_rates',
        name: 'Reasonable Rates',
        description: 'Electricity rates should be within market bounds',
        severity: 'warning',
        validate: (data) => {
          if (data.rate_c_per_kwh !== undefined) {
            return data.rate_c_per_kwh >= 5 && data.rate_c_per_kwh <= 100; // 5-100 c/kWh
          }
          return true;
        },
        message: (data) => `Electricity rate ${data.rate_c_per_kwh} c/kWh outside market range (5-100 c/kWh)`
      }
    ];

    rules.forEach(rule => this.rules.set(rule.id, rule));
  }

  private timeToMinutes(timeStr: string): number {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  private subscribeToBus() {
    // Validate all incoming data
    messageBus.subscribe('bill.extracted', (message) => {
      this.validateData('bill.extracted', message.value);
    });

    messageBus.subscribe('plan.parsed', (message) => {
      this.validateData('plan.parsed', message.value);
    });

    messageBus.subscribe('rec.sizing', (message) => {
      this.validateData('rec.sizing', message.value);
    });
  }

  public validateData(context: string, data: any): FirewallViolation[] {
    if (!this.isEnabled) return [];

    const violations: FirewallViolation[] = [];

    this.rules.forEach(rule => {
      try {
        if (!rule.validate(data)) {
          const violation: FirewallViolation = {
            ruleId: rule.id,
            severity: rule.severity,
            message: rule.message(data),
            data: { context, ...data },
            timestamp: Date.now()
          };

          violations.push(violation);
          this.violations.push(violation);

          // Publish violation to message bus
          messageBus.publish('anomaly.flagged', 
            { 
              field: rule.id, 
              value: data, 
              reason: violation.message,
              severity: rule.severity,
              context 
            },
            0.9,
            { model_id: 'DataFirewall', version: '1.0.0' }
          );

          // Log based on severity
          if (rule.severity === 'error') {
            console.error(`Data Firewall Error [${rule.id}]:`, violation.message);
          } else if (rule.severity === 'warning') {
            console.warn(`Data Firewall Warning [${rule.id}]:`, violation.message);
          }
        }
      } catch (error) {
        console.error(`Error running validation rule ${rule.id}:`, error);
      }
    });

    // Limit violation history
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-500);
    }

    return violations;
  }

  public addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  public getViolations(severity?: 'error' | 'warning' | 'info'): FirewallViolation[] {
    if (severity) {
      return this.violations.filter(v => v.severity === severity);
    }
    return [...this.violations];
  }

  public clearViolations(): void {
    this.violations = [];
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getStats() {
    return {
      enabled: this.isEnabled,
      totalRules: this.rules.size,
      totalViolations: this.violations.length,
      errorCount: this.violations.filter(v => v.severity === 'error').length,
      warningCount: this.violations.filter(v => v.severity === 'warning').length,
      infoCount: this.violations.filter(v => v.severity === 'info').length,
      recentViolations: this.violations.slice(-10)
    };
  }
}

// Global firewall instance
export const dataFirewall = new DataFirewall();