def build_qubo(prices, pv, load, constraints):
    """Build QUBO formulation for battery dispatch optimization.
    
    Args:
        prices: List of electricity prices per hour ($/kWh)
        pv: List of PV generation per hour (kWh)
        load: List of electricity demand per hour (kWh)
        constraints: Dict with P_ch_max, P_dis_max, soc_min, soc_max, eta_ch, eta_dis, export_cap
    
    Returns:
        Dict representing QUBO coefficients
    """
    # Simplified QUBO for demonstration
    # In reality, this would be much more complex with proper battery dynamics
    
    T = len(prices)  # Number of time steps
    Q = {}
    
    # Binary variables: x_ch_t (charge), x_dis_t (discharge) for each hour t
    # Objective: minimize cost = sum_t (price_t * net_import_t)
    # Constraint penalties: no simultaneous charge/discharge, SoC bounds
    
    penalty = 1000.0  # Large penalty for constraint violations
    
    for t in range(T):
        # Diagonal terms (individual variable costs)
        Q[f"ch_{t}", f"ch_{t}"] = prices[t] * constraints.get("P_ch_max", 5.0) / constraints.get("eta_ch", 0.95)
        Q[f"dis_{t}", f"dis_{t}"] = -prices[t] * constraints.get("P_dis_max", 5.0) * constraints.get("eta_dis", 0.95)
        
        # Penalty for simultaneous charge and discharge
        Q[f"ch_{t}", f"dis_{t}"] = penalty
    
    return Q