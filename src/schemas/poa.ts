import { z } from "zod";

export const PoaDaily = z.object({ 
  date: z.string(), 
  poa_kwh: z.number().nonnegative() 
});

export const PoaResponse = z.object({
  hourly: z.array(z.object({ 
    dt_utc: z.string(), 
    poa_wm2: z.number().optional(), 
    poa_kwh: z.number().optional() 
  })).optional(),
  daily: z.array(PoaDaily),
  meta: z.object({ 
    source: z.string(), 
    cached: z.boolean() 
  })
});

export type TPoaResponse = z.infer<typeof PoaResponse>;