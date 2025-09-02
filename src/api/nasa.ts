import { supabase } from "@/integrations/supabase/client";
import { PoaResponse } from "@/schemas/poa";

export async function getPoa(args: {
  lat: number;
  lng: number;
  tilt: number;
  azimuth: number;
  start: string;
  end: string;
}) {
  const { data, error } = await supabase.functions.invoke('nasa-power-poa', {
    body: args
  });
  
  if (error) throw new Error(`POA fetch failed: ${error.message}`);
  return PoaResponse.parse(data);
}