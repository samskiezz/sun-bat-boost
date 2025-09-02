import { z } from "zod";

export const OptimizerRequest = z.object({
  prices: z.array(z.number()),
  pv: z.array(z.number()),
  load: z.array(z.number()),
  constraints: z.object({
    battery_capacity_kwh: z.number(),
    battery_power_kw: z.number(),
    initial_soc: z.number().min(0).max(1)
  }),
  solver: z.enum(["milp", "qaoa", "anneal"])
});

export const OptimizerResponse = z.object({
  schedule: z.array(z.object({
    hour: z.number(),
    battery_charge: z.number(),
    battery_discharge: z.number(),
    grid_import: z.number(),
    grid_export: z.number(), 
    soc: z.number()
  })),
  metadata: z.object({
    solver: z.string(),
    objective: z.number(),
    execution_time: z.number(),
    convergence: z.boolean().optional(),
    bitstring: z.string().optional()
  }),
  constraints_satisfied: z.boolean(),
  energy_balance: z.array(z.number())
});

export type TOptimizerRequest = z.infer<typeof OptimizerRequest>;
export type TOptimizerResponse = z.infer<typeof OptimizerResponse>;