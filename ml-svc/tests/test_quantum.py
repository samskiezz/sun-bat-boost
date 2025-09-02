import pytest
from quantum.anneal_neal import solve_qubo_anneal
from quantum.qaoa_qiskit import solve_qubo_qaoa
from quantum.qubo import build_qubo
from optim.classical_milp import solve_milp


def test_anneal_basic():
    """Test basic simulated annealing functionality"""
    Q = {("x0", "x0"): -1.0, ("x1", "x1"): -1.0, ("x0", "x1"): 0.5}
    result = solve_qubo_anneal(Q)
    
    assert "bitstring" in result
    assert "energy" in result
    assert isinstance(result["bitstring"], str)
    assert isinstance(result["energy"], (int, float))


def test_qaoa_basic():
    """Test basic QAOA functionality"""
    Q = {("x0", "x0"): -1.0, ("x1", "x1"): -1.0, ("x0", "x1"): 0.5}
    result = solve_qubo_qaoa(Q)
    
    assert "bitstring" in result
    assert "energy" in result
    assert isinstance(result["energy"], (int, float))


def test_build_qubo():
    """Test QUBO construction"""
    prices = [0.3, 0.25, 0.5]
    pv = [0, 0.5, 1.2]
    load = [0.6, 0.7, 0.8]
    constraints = {
        "P_ch_max": 5,
        "P_dis_max": 5,
        "soc_min": 0.1,
        "soc_max": 1,
        "eta_ch": 0.95,
        "eta_dis": 0.95
    }
    
    Q = build_qubo(prices, pv, load, constraints)
    
    assert isinstance(Q, dict)
    assert len(Q) > 0
    # Check that coefficients are reasonable
    for key, value in Q.items():
        assert isinstance(value, (int, float))


def test_milp_solver():
    """Test classical MILP solver"""
    prices = [0.3, 0.25, 0.5, 0.6]
    pv = [0, 0.5, 1.2, 0.9]
    load = [0.6, 0.7, 0.8, 0.9]
    constraints = {
        "P_ch_max": 5,
        "P_dis_max": 5,
        "soc_min": 0.1,
        "soc_max": 1,
        "eta_ch": 0.95,
        "eta_dis": 0.95,
        "export_cap": 5
    }
    
    result = solve_milp(prices, pv, load, constraints)
    
    assert "schedule" in result
    assert "soc_series" in result
    assert "cost" in result
    assert isinstance(result["cost"], (int, float))
    
    if result["schedule"]:  # If solution found
        assert len(result["schedule"]) == len(prices)
        assert len(result["soc_series"]) == len(prices)
        
        # Check schedule structure
        for hour_data in result["schedule"]:
            assert "hour" in hour_data
            assert "charge_kw" in hour_data
            assert "discharge_kw" in hour_data