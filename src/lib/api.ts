// API helper with error surfacing
export async function callJSON(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const corr = r.headers.get('x-correlation-id') || 'n/a';
  const text = await r.text().catch(() => '');
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* leave as text */ }

  if (!r.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${r.status}`;
    const err = new Error(`${msg} [corr=${corr}]`);
    (err as any).status = r.status;
    (err as any).correlationId = corr;
    throw err;
  }
  return json ?? {};
}