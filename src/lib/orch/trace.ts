export type SpanEdge = {
  id: string;
  ts: number;
  from: string;
  to: string;
  summary: string;
  data?: any;
};

export type ModelMessage = {
  id: string;
  ts: number;
  from: string;
  to: string;
  topic: string;
  content: any;
  confidence?: number;
};

const edges: SpanEdge[] = [];
const messages: ModelMessage[] = [];

export function recordEdge(from: string, to: string, summary: string, data?: any) {
  const e: SpanEdge = { id: crypto.randomUUID(), ts: Date.now(), from, to, summary, data };
  edges.push(e);
  return e;
}

export function recordMessage(msg: Omit<ModelMessage, "id" | "ts">) {
  const m: ModelMessage = { id: crypto.randomUUID(), ts: Date.now(), ...msg };
  messages.push(m);
  return m;
}

export function getEdges() { return edges.slice(-500); }
export function getMessages() { return messages.slice(-500); }
export function clearOrchTrace() { edges.length = 0; messages.length = 0; }