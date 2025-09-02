export async function api<T>(path: string, schema: { parse: (x: any) => T }) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return schema.parse(await r.json());
}