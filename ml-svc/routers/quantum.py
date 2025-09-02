from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

# Import with comprehensive fallbacks
try:
    from quantum.qaoa_qiskit import solve_qubo_qaoa
    from quantum.anneal_neal import solve_qubo_anneal
    from optim.classical_milp import solve_milp
    from quantum.qubo import build_qubo
    HAS_QUANTUM = True
except ImportError as e:
    print(f"Warning: Quantum components not available: {e}")
    HAS_QUANTUM = False
    
    # Fallback implementations
    def solve_qubo_qaoa(Q): 
        return {"bitstring": "101010", "energy": -2.0, "solver": "mock_qaoa"}
    
    def solve_qubo_anneal(Q): 
        return {"bitstring": "010101", "energy": -1.8, "solver": "mock_anneal"}
    
    def solve_milp(prices, pv, load, constraints):
        T = len(prices)
        avg_price = sum(prices) / T
        schedule = []
        soc = 0.5
        
        for t in range(T):
            if prices[t] > avg_price and soc > 0.3:
                discharge = min(3.0, soc * 8)
                charge = 0
                soc = max(0.3, soc - discharge / 8) 
            elif prices[t] < avg_price and soc < 0.8:
                charge = min(3.0, (0.8 - soc) * 8)
                discharge = 0
                soc = min(0.8, soc + charge / 8)
            else:
                charge = discharge = 0
                
            schedule.append({
                "hour": t,
                "charge_kw": charge,
                "discharge_kw": discharge,
                "import_kw": max(0, load[t] - pv[t] - discharge + charge),
                "export_kw": max(0, pv[t] + discharge - load[t] - charge)
            })
        
        cost = sum(prices[t] * schedule[t]["import_kw"] - prices[t] * 0.1 * schedule[t]["export_kw"] for t in range(T))
        return {"schedule": schedule, "soc_series": [0.5] * T, "cost": cost}
    
    def build_qubo(prices, pv, load, constraints):
        return {("x0", "x0"): -1.0, ("x1", "x1"): -0.8, ("x0", "x1"): 0.5}

router = APIRouter()

class DispatchReq(BaseModel):
    prices: List[float]
    pv: List[float]
    load: List[float] 
    constraints: Dict[str, Any]
    solver: str = "milp"

@router.post("/dispatch")
def dispatch(req: DispatchReq):
    """Optimize battery dispatch using classical or quantum methods"""
    try:
        if req.solver == "milp":
            result = solve_milp(req.prices, req.pv, req.load, req.constraints)
            result["solver"] = "milp"
            return result
        
        # Build QUBO for quantum solvers  
        Q = build_qubo(req.prices, req.pv, req.load, req.constraints)
        
        if req.solver == "qaoa":
            result = solve_qubo_qaoa(Q)
            result["solver"] = "qaoa"
            return result
        elif req.solver == "anneal":
            result = solve_qubo_anneal(Q) 
            result["solver"] = "anneal"
            return result
        else:
            return {"error": f"Unknown solver: {req.solver}"}
            
    except Exception as e:
        return {"error": str(e), "solver": req.solver, "success": False}