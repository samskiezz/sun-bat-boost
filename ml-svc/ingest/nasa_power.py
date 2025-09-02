import os
import requests
import pandas as pd
import pyarrow.parquet as pq
import pyarrow as pa
from pathlib import Path

CACHE_DIR = Path(os.getenv("CACHE_DIR", "/tmp/nasa-cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(lat, lng, yyyymmdd):
    return CACHE_DIR / f"{lat:.4f}_{lng:.4f}_{yyyymmdd}.parquet"


def fetch_hourly(lat: float, lng: float, start: str, end: str) -> pd.DataFrame:
    """Fetch hourly NASA POWER data for given coordinates and date range.
    
    Args:
        lat, lng: Coordinates
        start, end: Date strings in YYYY-MM-DD format
    
    Returns:
        DataFrame with hourly irradiance and weather data
    """
    params = {
        "community": "RE",
        "parameters": "ALLSKY_SFC_SW_DWN,DNI,DHI,T2M,RH2M,WS10M",
        "latitude": lat,
        "longitude": lng,
        "start": start.replace("-", ""),
        "end": end.replace("-", ""),
        "format": "JSON"
    }
    
    url = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    response = requests.get(url, params=params, timeout=30)
    j = response.json()
    
    p = j.get("properties", {}).get("parameter", {})
    
    # Keys are yyyymmddHH; build tidy frame
    keys = list(p.get("DNI", {}).keys())
    rows = []
    
    for k in keys:
        dt = pd.to_datetime(k, format="%Y%m%d%H", utc=True)
        rows.append({
            "dt_utc": dt,
            "GHI": p.get("ALLSKY_SFC_SW_DWN", {}).get(k, None),
            "DNI": p.get("DNI", {}).get(k, None),
            "DHI": p.get("DHI", {}).get(k, None),
            "T2M": p.get("T2M", {}).get(k, None),
            "RH2M": p.get("RH2M", {}).get(k, None),
            "WS10M": p.get("WS10M", {}).get(k, None),
        })
    
    df = pd.DataFrame(rows).dropna(subset=["GHI", "DNI", "DHI"])
    return df.sort_values("dt_utc").reset_index(drop=True)


def cached_hourly(lat, lng, start, end):
    """Get hourly data with per-day caching."""
    dfr = []
    
    for day in pd.date_range(start, end, freq="D"):
        ymd = day.strftime("%Y%m%d")
        cp = _cache_path(lat, lng, ymd)
        
        if cp.exists():
            dfr.append(pq.read_table(cp).to_pandas())
        else:
            df = fetch_hourly(lat, lng, day.strftime("%Y-%m-%d"), day.strftime("%Y-%m-%d"))
            pq.write_table(pa.Table.from_pandas(df), cp)
            dfr.append(df)
    
    return pd.concat(dfr, ignore_index=True) if dfr else pd.DataFrame()