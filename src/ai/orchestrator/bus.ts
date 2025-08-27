import type { Topics } from "./contracts";

type Handler = (e: any) => void | Promise<void>;

const subs: Record<string, Handler[]> = {};

export function publish(e: Topics) { 
  (subs[e.topic] || []).forEach(h => h(e)); 
  (window as any).__buslog?.push?.(e); 
}

export function subscribe<T extends Topics["topic"]>(topic: T, h: Handler) { 
  (subs[topic] = subs[topic] || []).push(h); 
}

// Global access for debugging
(window as any).bus = { publish, subscribe };
(window as any).__buslog = [];