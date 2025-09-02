import dimod
import neal


def solve_qubo_anneal(Q):
    """Solve QUBO using simulated annealing (Neal).
    
    Args:
        Q: QUBO coefficient dictionary
        
    Returns:
        Dict with best bitstring and energy
    """
    try:
        # Convert QUBO to BQM
        bqm = dimod.BinaryQuadraticModel.from_qubo(Q)
        
        # Sample using simulated annealing
        sampler = neal.SimulatedAnnealingSampler()
        response = sampler.sample(bqm, num_reads=200)
        
        # Get best solution
        best_sample = response.first.sample
        best_energy = response.first.energy
        
        # Convert to bitstring
        variables = sorted(best_sample.keys())
        bitstring = "".join("1" if best_sample[var] else "0" for var in variables)
        
        return {"bitstring": bitstring, "energy": best_energy}
        
    except Exception as e:
        return {"bitstring": "", "energy": 0.0, "error": str(e)}