try:
    from ortools.linear_solver import pywraplp
    HAS_ORTOOLS = True
except ImportError:
    print("Warning: OR-Tools not available, using heuristic optimization")
    HAS_ORTOOLS = False

def solve_milp(prices, pv, load, constraints):
    """Solve battery dispatch using classical MILP optimization (with heuristic fallback)"""
    
    if not HAS_ORTOOLS:
        return solve_heuristic(prices, pv, load, constraints)
    
    try:
        T = len(prices)
        
        # Create solver
        solver = pywraplp.Solver.CreateSolver('SCIP')
        if not solver:
            solver = pywraplp.Solver.CreateSolver('GLOP') 
        if not solver:
            return solve_heuristic(prices, pv, load, constraints)
        
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
                solver.Add(SoC[t] == SoC[t-1] + P_ch[t-1] * eta_ch / 10 - P_dis[t-1] / (eta_dis * 10))
        
        # Objective: minimize cost
        cost = sum(prices[t] * P_import[t] - prices[t] * 0.1 * P_export[t] for t in range(T))
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
            return solve_heuristic(prices, pv, load, constraints)
            
    except Exception as e:
        print(f"MILP solver failed: {e}, using heuristic")
        return solve_heuristic(prices, pv, load, constraints)

def solve_heuristic(prices, pv, load, constraints):
    """Heuristic battery dispatch when MILP solver unavailable"""
    T = len(prices)
    schedule = []
    soc_series = []
    soc = 0.5  # Start at 50% SoC
    
    avg_price = sum(prices) / len(prices)
    
    for t in range(T):
        charge_kw = 0
        discharge_kw = 0
        
        net_demand = load[t] - pv[t]  # Positive = need import, negative = excess
        
        if prices[t] < avg_price and soc < 0.9 and net_demand < 0:
            # Low price + excess PV + room to charge -> charge
            charge_kw = min(constraints.get("P_ch_max", 5), abs(net_demand), (0.9 - soc) * 10)
            soc = min(0.9, soc + charge_kw * constraints.get("eta_ch", 0.95) / 10)
            
        elif prices[t] > avg_price and soc > 0.2 and net_demand > 0:
            # High price + need power + battery has charge -> discharge
            discharge_kw = min(constraints.get("P_dis_max", 5), net_demand, (soc - 0.2) * 10 * constraints.get("eta_dis", 0.95))
            soc = max(0.2, soc - discharge_kw / (constraints.get("eta_dis", 0.95) * 10))
        
        # Calculate resulting power flows
        net_after_battery = net_demand + charge_kw - discharge_kw
        import_kw = max(0, net_after_battery)
        export_kw = max(0, -net_after_battery)
        
        schedule.append({
            "hour": t,
            "charge_kw": charge_kw,
            "discharge_kw": discharge_kw,
            "import_kw": import_kw,
            "export_kw": min(export_kw, constraints.get("export_cap", 5))
        })
        soc_series.append(soc)
    
    # Calculate total cost
    total_cost = sum(prices[t] * schedule[t]["import_kw"] - prices[t] * 0.1 * schedule[t]["export_kw"] for t in range(T))
    
    return {
        "schedule": schedule,
        "soc_series": soc_series,
        "cost": total_cost
    }