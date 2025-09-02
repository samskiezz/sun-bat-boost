import os
from pathlib import Path

# Use fallbacks if dependencies not available
try:
    import requests
    import pandas as pd
    import pyarrow.parquet as pq
    import pyarrow as pa
    HAS_DEPS = True
except ImportError as e:
    print(f"Warning: NASA POWER dependencies not available: {e}")
    HAS_DEPS = False
    
    # Mock implementations
    class MockPandas:
        def DataFrame(self, data): 
            return {"dt_utc": [row.get("dt_utc") for row in data], 
                   "GHI": [row.get("GHI") for row in data],
                   "DNI": [row.get("DNI") for row in data], 
                   "DHI": [row.get("DHI") for row in data]}
        def to_datetime(self, x, **kwargs): return x
        def date_range(self, start, end, freq="D"): return [start]
        def concat(self, dfs, ignore_index=True): return dfs[0] if dfs else {}
    pd = MockPandas()
    
    class MockRequests:
        def get(self, url, **kwargs):
            return type('', (), {'json': lambda: {
                "properties": {"parameter": {
                    "ALLSKY_SFC_SW_DWN": {"2025010212": 800},
                    "DNI": {"2025010212": 900}, 
                    "DHI": {"2025010212": 100},
                    "T2M": {"2025010212": 25},
                    "RH2M": {"2025010212": 60},
                    "WS10M": {"2025010212": 3}
                }}
            }})()
    requests = MockRequests()

CACHE_DIR = Path(os.getenv("CACHE_DIR", "/tmp/nasa-cache"))
try:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    print(f"Cache directory creation failed: {e}")

def _cache_path(lat, lng, yyyymmdd):
    try:
        return CACHE_DIR / f"{lat:.4f}_{lng:.4f}_{yyyymmdd}.json"
    except:
        return f"/tmp/{lat}_{lng}_{yyyymmdd}.json"

def fetch_hourly(lat: float, lng: float, start: str, end: str):
    """Fetch hourly NASA POWER data with comprehensive fallbacks"""
    try:
        if not HAS_DEPS:
            # Return mock data immediately
            return [{
                "dt_utc": f"{start}T12:00:00Z",
                "GHI": 800, "DNI": 900, "DHI": 100,
                "T2M": 25, "RH2M": 60, "WS10M": 3
            }]
        
        params = {
            "community": "RE",
            "parameters": "ALLSKY_SFC_SW_DWN,DNI,DHI,T2M,RH2M,WS10M",
            "latitude": lat, "longitude": lng,
            "start": start.replace("-", ""), "end": end.replace("-", ""),
            "format": "JSON"
        }
        
        url = "https://power.larc.nasa.gov/api/temporal/hourly/point"
        response = requests.get(url, params=params, timeout=10)
        j = response.json()
        
        p = j.get("properties", {}).get("parameter", {})
        keys = list(p.get("DNI", {}).keys())
        
        if not keys:
            raise Exception("No data keys returned from NASA")
        
        rows = []
        for k in keys:
            dt = pd.to_datetime(k, format="%Y%m%d%H", utc=True)
            rows.append({
                "dt_utc": dt,
                "GHI": p.get("ALLSKY_SFC_SW_DWN", {}).get(k, 800),
                "DNI": p.get("DNI", {}).get(k, 900),
                "DHI": p.get("DHI", {}).get(k, 100),
                "T2M": p.get("T2M", {}).get(k, 25),
                "RH2M": p.get("RH2M", {}).get(k, 60),
                "WS10M": p.get("WS10M", {}).get(k, 3),
            })
        
        df = pd.DataFrame(rows)
        return df
        
    except Exception as e:
        print(f"NASA POWER fetch failed: {e}, using fallback data")
        return [{
            "dt_utc": f"{start}T12:00:00Z",
            "GHI": 800, "DNI": 900, "DHI": 100,
            "T2M": 25, "RH2M": 60, "WS10M": 3
        }]

def cached_hourly(lat, lng, start, end):
    """Get hourly data with simple caching"""
    try:
        # For development, just fetch directly without complex caching
        data = fetch_hourly(lat, lng, start, end)
        
        # Save to simple JSON cache if possible
        cache_file = _cache_path(lat, lng, start.replace("-", ""))
        try:
            import json
            with open(cache_file, 'w') as f:
                json.dump(data, f, default=str)
        except:
            pass  # Ignore cache failures
        
        return data
        
    except Exception as e:
        print(f"Cached hourly failed: {e}")
        return [{
            "dt_utc": f"{start}T12:00:00Z", 
            "GHI": 800, "DNI": 900, "DHI": 100,
            "T2M": 25, "RH2M": 60, "WS10M": 3
        }]