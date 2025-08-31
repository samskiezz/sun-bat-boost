// Replace with your framework's API style if needed.
export async function GET() {
  const { getEdges, getMsgs } = await import("@/lib/orch/trace");
  const body = JSON.stringify({ edges: getEdges(), messages: getMsgs() });
  return new Response(body, { headers: { "Content-Type": "application/json" } });
}