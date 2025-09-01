export async function POST({ request }: any) {
  const body = await request.json();
  // TODO: write accepted links to DB ("links" table) and emit events
  return new Response(JSON.stringify({ ok: true, applied: body?.createLinks?.length || 0 }), { headers: { "Content-Type": "application/json" } });
}