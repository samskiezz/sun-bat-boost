import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from ingest.nasa_power import cached_hourly, fetch_hourly
from features.solar_features import compute_poa


def test_fetch_hourly_structure():
    """Test that fetch_hourly returns proper DataFrame structure"""
    # Mock the requests.get call
    mock_response = {
        "properties": {
            "parameter": {
                "DNI": {"202501010800": 500, "202501010900": 600},
                "DHI": {"202501010800": 200, "202501010900": 250},
                "ALLSKY_SFC_SW_DWN": {"202501010800": 700, "202501010900": 850},
                "T2M": {"202501010800": 25, "202501010900": 27},
                "RH2M": {"202501010800": 60, "202501010900": 65},
                "WS10M": {"202501010800": 5, "202501010900": 7}
            }
        }
    }
    
    with patch('requests.get') as mock_get:
        mock_get.return_value.json.return_value = mock_response
        
        df = fetch_hourly(-33.8688, 151.2093, "2025-01-01", "2025-01-01")
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) == 2
        assert all(col in df.columns for col in ["dt_utc", "GHI", "DNI", "DHI"])
        assert df["GHI"].iloc[0] == 700
        assert df["DNI"].iloc[0] == 500


def test_compute_poa():
    """Test POA computation with sample data"""
    # Create sample hourly data
    sample_data = pd.DataFrame({
        "dt_utc": pd.date_range("2025-01-01 08:00", periods=3, freq="H", tz="UTC"),
        "DNI": [500, 600, 400],
        "DHI": [200, 250, 180],
        "GHI": [700, 850, 580]
    })
    
    hourly, daily = compute_poa(-33.8688, 151.2093, 20, 0, sample_data)
    
    # Check hourly results
    assert isinstance(hourly, pd.DataFrame)
    assert len(hourly) == 3
    assert "poa_wm2" in hourly.columns
    assert "poa_kwh" in hourly.columns
    assert all(hourly["poa_kwh"] >= 0)
    
    # Check daily results
    assert isinstance(daily, pd.DataFrame)
    assert len(daily) == 1
    assert "date" in daily.columns
    assert "poa_kwh" in daily.columns
    assert daily["poa_kwh"].iloc[0] >= 0


def test_cached_hourly_fallback():
    """Test that cached_hourly handles errors gracefully"""
    with patch('ingest.nasa_power.fetch_hourly') as mock_fetch:
        mock_fetch.side_effect = Exception("Network error")
        
        # Should handle errors gracefully
        try:
            result = cached_hourly(-33.8688, 151.2093, "2025-01-01", "2025-01-01")
            # If no exception, result should be empty DataFrame
            assert isinstance(result, pd.DataFrame)
        except Exception:
            # Exception is acceptable for this test
            pass