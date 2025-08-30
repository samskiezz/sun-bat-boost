export type DataEvent =
  | { type: "POLY.DATA.BUILT"; payload: { sources: string[]; hulls: Record<string, [number, number][]> } }
  | { type: "MATCH.DONE"; payload: { pairs: Array<{ a: string; b: string; iou: number; jaccard: number }> } }
  | { type: "ERROR"; payload: { where: string; message: string } }
  | { type: "MSG"; payload: { from: string; to: string; topic: string; content: any; confidence?: number } };

type Handler = (e: DataEvent) => void;
const subs = new Set<Handler>();
export function publish(e: DataEvent){ for(const h of subs) try{ h(e) } catch{} }
export function subscribe(h: Handler){ 
  subs.add(h); 
  return () => { 
    subs.delete(h); 
  }; 
}