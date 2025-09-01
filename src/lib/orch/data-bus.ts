export type DataEvent =
  | { type: "POLY.DATA.BUILT"; payload: { sources: string[]; hulls: Record<string, [number, number][]> } }
  | { type: "MATCH.DONE"; payload: { pairs: Array<{ a: string; b: string; iou: number; jaccard: number }> } }
  | { type: "ERROR"; payload: { where: string; message: string } }
  | { type: "MSG"; payload: { from: string; to: string; topic: string; content: any; confidence?: number } };

type Handler = (e: DataEvent) => void;
const g = globalThis as any;

if (!g.__databus) {
  const subs = new Set<Handler>();
  const buffer: DataEvent[] = [];
  const MAX = 200;
  g.__databus = {
    publish(e: DataEvent){ buffer.push(e); if (buffer.length>MAX) buffer.shift(); subs.forEach(h=>{try{h(e)}catch{}}); },
    subscribe(h: Handler, replay = true){ subs.add(h); if (replay) buffer.forEach(e=>{try{h(e)}catch{}}); return ()=>subs.delete(h); },
    getBuffer(){ return buffer.slice(); }
  };
}

export const publish: (e: DataEvent)=>void = g.__databus.publish;
export const subscribe: (h: Handler, replay?: boolean)=>()=>void = g.__databus.subscribe;
export const getEventBuffer: ()=>DataEvent[] = g.__databus.getBuffer;