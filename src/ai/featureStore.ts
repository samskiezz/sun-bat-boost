type Row = { key: string; value: any; ts: number };

const mem: Record<string, Row> = {};

export function put(key: string, value: any) { 
  mem[key] = { key, value, ts: Date.now() }; 
}

export function get(key: string) { 
  return mem[key]?.value; 
}

export function all() { 
  return Object.values(mem); 
}