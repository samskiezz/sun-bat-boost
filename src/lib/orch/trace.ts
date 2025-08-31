export type Edge = { id: string; seq: number; ts: number; from: string; to: string; summary: string; data?: any };
export type Msg  = { id: string; seq: number; ts: number; from: string; to: string; topic: string; content: any; confidence?: number };

const edges: Edge[] = [];
const msgs: Msg[] = [];
let SEQ = 0;

export function recordEdge(from:string,to:string,summary:string,data?:any){
  const e: Edge = { id: crypto.randomUUID(), seq: ++SEQ, ts: performance.now(), from, to, summary, data };
  edges.push(e);
  return e;
}
export function recordMsg(m: Omit<Msg,"id"|"ts"|"seq">){
  const x: Msg = { id: crypto.randomUUID(), seq: ++SEQ, ts: performance.now(), ...m };
  msgs.push(x);
  return x;
}
export function getEdges(){ return edges.slice(-1000); }
export function getMsgs(){ return msgs.slice(-1000); }
export function clearOrchTrace(){ edges.length = 0; msgs.length = 0; SEQ = 0; }