// AI Orchestrator Message Bus
// Coordinates communication between 15+ ML models and system components

export interface BaseMessage {
  type: string;
  timestamp: number;
  sessionId: string;
  value: any;
  confidence: number;
  provenance: {
    model_id: string;
    version: string;
  };
  intervals?: {
    lo: number;
    hi: number;
  };
}

export interface MessageContract<T = any> extends BaseMessage {
  type: string;
  value: T;
}

// Message type definitions
export type MessageTypes = {
  'doc.parsed': { text: string; layout: string; fields: Record<string, any> };
  'bill.extracted': { retailer: string; plan: string; nmi: string; rates: any };
  'plan.parsed': { tou_windows: any[]; rates: any; type: string };
  'plan.selected': { plan_id: string; rates: any };
  'load.estimated': { hourly_kwh: number[]; archetype: string };
  'pv.estimated': { hourly_kwh: number[]; capacity_factor: number };
  'rec.sizing': { pv_kw: number; battery_kwh: number; constraints: string[] };
  'dispatch.sim': { hourly_data: any[]; annual_kwh: number };
  'roi.calculated': { payback: number; npv: number; irr: number };
  'rec.plan': { recommendation: string; confidence: number };
  'anomaly.flagged': { field: string; value: any; reason: string; severity?: string; context?: string };
  'user.corrected': { field: string; old_value: any; new_value: any };
  'user.action': { action: string; tab?: string; data?: any; context?: any };
  'pipeline.selected': { pipeline: string; features: any; mode: string; score?: number };
  'train.dataset.append': { inputs: any; truth: any; correction: boolean };
  'model.updated': { model_id: string; accuracy: number; version: string };
  'accuracy.mode': { mode: 'auto' | 'preview' | 'standard' | 'exact'; chosen: boolean };
};

export class MessageBus {
  private subscribers: Map<string, Array<(message: BaseMessage) => void>> = new Map();
  private sessionId: string;

  constructor() {
    this.sessionId = crypto.randomUUID();
  }

  // Subscribe to message type
  subscribe<K extends keyof MessageTypes>(
    type: K,
    handler: (message: MessageContract<MessageTypes[K]>) => void
  ): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    
    const handlers = this.subscribers.get(type)!;
    handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  // Publish message
  publish<K extends keyof MessageTypes>(
    type: K,
    value: MessageTypes[K],
    confidence: number,
    provenance: { model_id: string; version: string },
    intervals?: { lo: number; hi: number }
  ): void {
    const message: BaseMessage = {
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      value,
      confidence,
      provenance,
      intervals
    };

    // Notify subscribers
    const handlers = this.subscribers.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error(`Error in message handler for ${type}:`, error);
      }
    });

    // Also dispatch as DOM event for cross-component communication
    window.dispatchEvent(new CustomEvent(`ai.${type}`, { detail: message }));
  }

  // Get current session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Clear all subscribers (for cleanup)
  clear(): void {
    this.subscribers.clear();
  }
}

// Global message bus instance
export const messageBus = new MessageBus();

// Convenience hook for React components
export const useMessageBus = () => {
  return messageBus;
};