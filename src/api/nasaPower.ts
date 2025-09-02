export async function fetchPoaDaily(
  lat: number,
  lng: number,
  tilt: number,
  az: number,
  startISO: string,
  endISO: string
) {
  const qs = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    tilt: String(tilt),
    azimuth: String(az),
    start: startISO,
    end: endISO,
  });

  const r = await fetch(`/api/features/poa?${qs.toString()}`);
  if (!r.ok) throw new Error("POA fetch failed");
  
  return r.json() as Promise<{
    hourly: Array<{ dt_utc: string; poa_wm2: number; poa_kwh: number }>;
    daily: Array<{ date: string; poa_kwh: number }>;
    meta: { source: string; cached: boolean };
  }>;
}