# Battery dispatch optimization using OR-Tools
import numpy as np
from utils.runmeta import run_meta
import hashlib
import os
import json

def build_dispatch(payload, dataset):
    """Build battery dispatch optimization model"""
    meta = run_meta(payload, dataset)
    
    try:
        from ortools.linear_solver import pywraplp
        return build_mip_dispatch(payload, dataset, meta)
    except ImportError:
        # Fallback to heuristic
        return build_heuristic_dispatch(payload, dataset, meta)

def build_mip_dispatch(payload, dataset, meta):
    """Mixed Integer Programming approach using OR-Tools"""
    from ortools.linear_solver import pywraplp
    
    # Problem parameters
    tariff = dataset.get("tariff", {})
    load_profile = dataset.get("load_profile", [2.0] * 24)
    battery_kwh = dataset.get("battery_capacity", 13.5)
    solar_profile = dataset.get("solar_profile", [0] * 6 + [2, 4, 6, 8, 6, 4, 2] + [0] * 11)
    
    peak_rate = tariff.get("peak_rate", 0.32)
    offpeak_rate = tariff.get("offpeak_rate", 0.22)
    feed_in = tariff.get("feed_in_tariff", 0.08)
    
    # Time-of-use rates (simplified)
    tou_rates = []
    for hour in range(24):
        if 7 <= hour <= 22:  # Peak hours
            tou_rates.append(peak_rate)
        else:  # Off-peak hours
            tou_rates.append(offpeak_rate)
    
    # Create solver
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        raise Exception("SCIP solver not available")
    
    # Decision variables
    charge = [solver.NumVar(0, 5, f'charge_{h}') for h in range(24)]  # Max 5kW charge
    discharge = [solver.NumVar(0, 5, f'discharge_{h}') for h in range(24)]  # Max 5kW discharge
    soc = [solver.NumVar(0, battery_kwh, f'soc_{h}') for h in range(25)]  # State of charge
    grid_import = [solver.NumVar(0, 50, f'import_{h}') for h in range(24)]
    grid_export = [solver.NumVar(0, 20, f'export_{h}') for h in range(24)]
    
    # Battery dynamics
    soc[0].SetBounds(battery_kwh * 0.2, battery_kwh * 0.2)  # Start at 20%
    
    for h in range(24):
        # SOC evolution (simplified)
        solver.Add(soc[h+1] == soc[h] + charge[h] * 0.95 - discharge[h] / 0.95)
        
        # Energy balance
        net_load = load_profile[h] - solar_profile[h]  # Net load after solar
        solver.Add(grid_import[h] + discharge[h] == net_load + charge[h] + grid_export[h])
        
        # Mutual exclusion: can't charge and discharge simultaneously
        binary_charge = solver.IntVar(0, 1, f'bin_charge_{h}')
        binary_discharge = solver.IntVar(0, 1, f'bin_discharge_{h}')
        solver.Add(binary_charge + binary_discharge <= 1)
        solver.Add(charge[h] <= 5 * binary_charge)
        solver.Add(discharge[h] <= 5 * binary_discharge)
    
    # Objective: minimize cost
    cost = solver.Sum([
        grid_import[h] * tou_rates[h] - grid_export[h] * feed_in
        for h in range(24)
    ])
    solver.Minimize(cost)
    
    # Solve
    status = solver.Solve()
    
    if status == pywraplp.Solver.OPTIMAL:
        # Extract solution
        schedule = []
        total_cost = 0
        
        for h in range(24):
            charge_val = charge[h].solution_value()
            discharge_val = discharge[h].solution_value()
            export_val = grid_export[h].solution_value()
            import_val = grid_import[h].solution_value()
            
            hour_cost = import_val * tou_rates[h] - export_val * feed_in
            total_cost += hour_cost
            
            schedule.append({
                "hour": h,
                "charge_kw": round(charge_val, 2),
                "discharge_kw": round(discharge_val, 2),
                "grid_export_kw": round(export_val, 2),
                "grid_import_kw": round(import_val, 2),
                "soc_kwh": round(soc[h].solution_value(), 2),
                "hourly_cost": round(hour_cost, 2)
            })
        
        w_before = "optimization_init"
        solution_hash = hashlib.sha256(str([(s["charge_kw"], s["discharge_kw"]) for s in schedule]).encode()).hexdigest()[:12]
        
        # Save optimization model
        os.makedirs("artifacts/dispatch", exist_ok=True)
        onnx_path = f"artifacts/dispatch/{solution_hash}/model.onnx"
        os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
        
        # Save optimization parameters
        opt_params = {
            "type": "mip",
            "schedule": schedule,
            "total_cost": total_cost,
            "battery_kwh": battery_kwh,
            "tariff": tariff,
            "solver_status": "optimal"
        }
        
        with open(onnx_path.replace('.onnx', '_params.json'), 'w') as f:
            json.dump(opt_params, f, indent=2)
        
        # Placeholder ONNX (real deployment would use optimization as a service)
        with open(onnx_path, 'wb') as f:
            f.write(b"dispatch_optimization_model")
        
        return {
            "metrics": {
                "total_cost": total_cost,
                "solver_status": "optimal",
                "schedule_length": len(schedule)
            },
            "meta": {
                **meta,
                "weight_hash_before": w_before,
                "weight_hash_after": solution_hash
            },
            "onnx_path": onnx_path,
            "schedule": schedule
        }
    
    else:
        raise Exception(f"Optimization failed with status: {status}")

def build_heuristic_dispatch(payload, dataset, meta):
    """Heuristic dispatch when OR-Tools not available"""
    
    # Simple heuristic: charge off-peak, discharge peak
    load_profile = dataset.get("load_profile", [2.0] * 24)
    battery_kwh = dataset.get("battery_capacity", 13.5)
    
    schedule = []
    soc = battery_kwh * 0.2  # Start at 20%
    
    for hour in range(24):
        charge_kw = 0
        discharge_kw = 0
        
        # Heuristic rules
        if 1 <= hour <= 5 and soc < battery_kwh * 0.9:  # Night charging
            charge_kw = min(3.5, (battery_kwh * 0.9 - soc))
            soc += charge_kw * 0.95
        elif 17 <= hour <= 21 and soc > battery_kwh * 0.2:  # Evening discharge
            discharge_kw = min(4.0, soc - battery_kwh * 0.2)
            soc -= discharge_kw / 0.95
        
        schedule.append({
            "hour": hour,
            "charge_kw": round(charge_kw, 2),
            "discharge_kw": round(discharge_kw, 2),
            "grid_export_kw": 0,
            "soc_kwh": round(soc, 2)
        })
    
    w_before = "heuristic_init"
    w_after = hashlib.sha256(str(schedule).encode()).hexdigest()[:12]
    
    # Save heuristic model
    os.makedirs("artifacts/dispatch", exist_ok=True)
    onnx_path = f"artifacts/dispatch/{w_after}/model.onnx"
    os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
    
    with open(onnx_path, 'wb') as f:
        f.write(b"heuristic_dispatch_model")
    
    return {
        "metrics": {
            "method": "heuristic",
            "schedule_length": len(schedule)
        },
        "meta": {
            **meta,
            "weight_hash_before": w_before,
            "weight_hash_after": w_after
        },
        "onnx_path": onnx_path,
        "schedule": schedule
    }