// Replace with your framework's API pattern; this is a fetch handler-style example
export async function POST() {
  const sources = ["ModelA", "ModelB", "TariffDB", "CatalogDB"]; // Default for now
  const out = sources.map((s: string, i: number) => ({
    source: s,
    items: makeBlob(i) // deterministic blobs in 5D then projected
  }));
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
}

function makeBlob(seed: number) {
  // deterministic pseudo-random around a center that shifts per seed
  const rnd = mulberry32(seed + 42);
  const center = Array.from({length:5}, (_,i)=> (i+1)*(seed+1)*0.1);
  const n = 120;
  const arr: number[][] = [];
  for (let k=0; k<n; k++){
    arr.push(center.map(c => c + (rnd()-0.5)*0.6));
  }
  return arr;
}

function mulberry32(a: number){ 
  return function(){ 
    let t = a += 0x6D2B79F5; 
    t = Math.imul(t ^ t >>> 15, t | 1); 
    t ^= t + Math.imul(t ^ t >>> 7, t | 61); 
    return ((t ^ t >>> 14) >>> 0) / 4294967296; 
  } 
}