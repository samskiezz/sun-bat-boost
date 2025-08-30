export async function POST() {
  const { clearOrchTrace } = await import("@/lib/orch/trace");
  clearOrchTrace();
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}