export async function POST(request: Request) {
  try {
    const body = await request.json();
    // TODO: write accepted links to DB ("links" table) and emit events
    const applied = body?.createLinks?.length || 0;
    
    // Store applied links globally for future conflict detection
    if (applied > 0) {
      (window as any).__existingLinks = body.createLinks;
    }
    
    return new Response(JSON.stringify({ ok: true, applied }), { 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
}