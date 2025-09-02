from ortools.linear_solver import pywraplp


def solve_milp(prices, pv, load, constraints):
    """Solve battery dispatch using classical MILP optimization.
    
    Args:
        prices: List of electricity prices per hour
        pv: List of PV generation per hour  
        load: List of electricity demand per hour
        constraints: Battery specifications dict
        
    Returns:
        Dict with schedule, SoC series, and total cost
    """
    T = len(prices)
    
    # Create solver
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        return {"schedule": [], "soc_series": [], "cost": 0.0}
    
    # Variables
    P_ch = [solver.NumVar(0, constraints.get("P_ch_max", 5), f"P_ch_{t}") for t in range(T)]
    P_dis = [solver.NumVar(0, constraints.get("P_dis_max", 5), f"P_dis_{t}") for t in range(T)]
    P_import = [solver.NumVar(0, solver.infinity(), f"P_import_{t}") for t in range(T)]
    P_export = [solver.NumVar(0, constraints.get("export_cap", 5), f"P_export_{t}") for t in range(T)]
    SoC = [solver.NumVar(constraints.get("soc_min", 0.1), constraints.get("soc_max", 1), f"SoC_{t}") for t in range(T)]
    
    # Binary variables for charge/discharge
    x_ch = [solver.BoolVar(f"x_ch_{t}") for t in range(T)]
    x_dis = [solver.BoolVar(f"x_dis_{t}") for t in range(T)]
    
    # Constraints
    for t in range(T):
        # Power balance
        solver.Add(P_import[t] + pv[t] + P_dis[t] == load[t] + P_ch[t] + P_export[t])
        
        # No simultaneous charge/discharge  
        solver.Add(x_ch[t] + x_dis[t] <= 1)
        solver.Add(P_ch[t] <= constraints.get("P_ch_max", 5) * x_ch[t])
        solver.Add(P_dis[t] <= constraints.get("P_dis_max", 5) * x_dis[t])
        
        # SoC dynamics
        if t == 0:
            solver.Add(SoC[t] == 0.5)  # Initial SoC
        else:
            eta_ch = constraints.get("eta_ch", 0.95)
            eta_dis = constraints.get("eta_dis", 0.95)
            solver.Add(SoC[t] == SoC[t-1] + P_ch[t-1] * eta_ch - P_dis[t-1] / eta_dis)
    
    # Objective: minimize cost
    cost = sum(prices[t] * P_import[t] - prices[t] * 0.1 * P_export[t] for t in range(T))  # FiT = 10% of retail
    solver.Minimize(cost)
    
    # Solve
    status = solver.Solve()
    
    if status == pywraplp.Solver.OPTIMAL:
        schedule = []
        soc_series = []
        
        for t in range(T):
            schedule.append({
                "hour": t,
                "charge_kw": P_ch[t].solution_value(),
                "discharge_kw": P_dis[t].solution_value(),
                "import_kw": P_import[t].solution_value(),
                "export_kw": P_export[t].solution_value()
            })
            soc_series.append(SoC[t].solution_value())
        
        return {
            "schedule": schedule,
            "soc_series": soc_series,
            "cost": solver.Objective().Value()
        }
    else:
        return {"schedule": [], "soc_series": [], "cost": 0.0}