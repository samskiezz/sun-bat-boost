from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

from quantum.qaoa_qiskit import solve_qubo_qaoa
from quantum.anneal_neal import solve_qubo_anneal
from optim.classical_milp import solve_milp
from quantum.qubo import build_qubo

router = APIRouter()


class DispatchReq(BaseModel):
    prices: List[float]
    pv: List[float]
    load: List[float]
    constraints: Dict
    solver: str = "milp"


@router.post("/dispatch")
def dispatch(req: DispatchReq):
    """Optimize battery dispatch using classical or quantum methods."""
    
    if req.solver == "milp":
        return solve_milp(req.prices, req.pv, req.load, req.constraints)
    
    # Build QUBO for quantum solvers
    Q = build_qubo(req.prices, req.pv, req.load, req.constraints)
    
    if req.solver == "qaoa":
        return solve_qubo_qaoa(Q)
    elif req.solver == "anneal":
        return solve_qubo_anneal(Q)
    else:
        return {"error": f"Unknown solver: {req.solver}"}