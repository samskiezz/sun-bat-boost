import { supabase } from "@/integrations/supabase/client";
import { OptimizerResponse } from "@/schemas/optimizer";
import type { TOptimizerRequest } from "@/schemas/optimizer";

export async function runOptimizer(request: TOptimizerRequest) {
  const { data, error } = await supabase.functions.invoke('quantum-dispatch', {
    body: request
  });
  
  if (error) throw new Error(`Optimizer failed: ${error.message}`);
  return OptimizerResponse.parse(data);
}