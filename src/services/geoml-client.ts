import { supabase } from "@/integrations/supabase/client";

type LatLng = [number, number];

export async function embedPolygon(payload: { points: LatLng[] }) {
  const { data, error } = await supabase.functions.invoke('ml-poly-embed', {
    body: payload
  });
  
  if (error) throw new Error(`Embed failed: ${error.message}`);
  return data;
}

export async function matchPolygon(payload: { points: LatLng[]; k?: number }) {
  const { data, error } = await supabase.functions.invoke('ml-poly-match', {
    body: payload
  });
  
  if (error) throw new Error(`Match failed: ${error.message}`);
  return data;
}