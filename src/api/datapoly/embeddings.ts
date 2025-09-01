// Generate synthetic embeddings with better separation - fallback API route

function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function makeBlob(seed: number) {
  const rnd = mulberry32(seed + 4242);
  const center = Array.from({length:5}, (_,i)=> (i+1)*(seed+1)*1.2); // bigger separation
  const n = 160;
  const arr:number[][] = [];
  for (let k=0;k<n;k++){
    const r = center.map(c => c + (rnd()-0.5)*0.9); // a bit wider
    arr.push(r);
  }
  return arr;
}

export async function POST(request: Request) {
  try {
    const { sources } = await request.json();
    
    console.log("🔄 Using synthetic embeddings fallback for:", sources);
    
    const result = sources.map((source: string, idx: number) => ({
      source,
      items: makeBlob(idx),
      labels: Array.from({length: 160}, (_, i) => `${source}_item_${i}`)
    }));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Synthetic embeddings error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate synthetic embeddings" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}