type Adapter = { 
  name: string; 
  category: string; 
  infer: (payload: any) => Promise<any>; 
  health: () => Promise<{ok: boolean}>; 
};

const registry: Record<string, Adapter> = {};

export function registerAdapter(a: Adapter) { 
  registry[a.name] = a; 
}

export async function callAdapter(name: string, payload: any) { 
  if (!registry[name]) throw new Error("adapter_missing:" + name); 
  return registry[name].infer(payload); 
}

export function listAdapters() { 
  return Object.keys(registry); 
}