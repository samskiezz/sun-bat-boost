try:
    import pandas as pd
    import numpy as np
    import pvlib
    HAS_PVLIB = True
except ImportError:
    print("Warning: pvlib dependencies not available, using geometric fallbacks")
    HAS_PVLIB = False
    
    class MockPVLib:
        class solarposition:
            @staticmethod
            def get_solarposition(times, latitude, longitude):
                return {"apparent_zenith": [45] * len(times), "azimuth": [180] * len(times)}
        class irradiance:
            @staticmethod
            def get_extra_radiation(times): return [1361] * len(times)
            @staticmethod
            def get_total_irradiance(**kwargs): return {"poa_global": [kwargs.get("ghi", [800])[i] * 1.1 for i in range(len(kwargs.get("ghi", [800])))]}
        class atmosphere:
            @staticmethod
            def get_relative_airmass(zenith): return [1.5] * len(zenith)
    pvlib = MockPVLib()

def compute_poa(lat, lng, tilt, azimuth, df_hourly):
    """Compute plane-of-array irradiance with pvlib physics (or geometric fallbacks)"""
    try:
        # Handle different input formats
        if isinstance(df_hourly, list):
            times = [row.get("dt_utc", "2025-01-02T12:00:00Z") for row in df_hourly]
            dni_values = [float(row.get("DNI", 900)) for row in df_hourly]
            dhi_values = [float(row.get("DHI", 100)) for row in df_hourly] 
            ghi_values = [float(row.get("GHI", 800)) for row in df_hourly]
        elif isinstance(df_hourly, dict):
            times = df_hourly.get("dt_utc", ["2025-01-02T12:00:00Z"])
            dni_values = df_hourly.get("DNI", [900])
            dhi_values = df_hourly.get("DHI", [100])
            ghi_values = df_hourly.get("GHI", [800])
        else:
            # Assume DataFrame-like with column access
            times = df_hourly["dt_utc"]
            dni_values = [float(x) for x in df_hourly["DNI"]]
            dhi_values = [float(x) for x in df_hourly["DHI"]]
            ghi_values = [float(x) for x in df_hourly["GHI"]]

        if HAS_PVLIB:
            # Full pvlib calculation
            try:
                import pandas as pd
                times_pd = pd.to_datetime(times)
                sp = pvlib.solarposition.get_solarposition(times=times_pd, latitude=lat, longitude=lng)
                dni_extra = pvlib.irradiance.get_extra_radiation(times_pd)
                airmass = pvlib.atmosphere.get_relative_airmass(sp['apparent_zenith'])
                
                poa = pvlib.irradiance.get_total_irradiance(
                    surface_tilt=tilt, surface_azimuth=azimuth,
                    dni=dni_values, ghi=ghi_values, dhi=dhi_values,
                    dni_extra=dni_extra, airmass=airmass,
                    solar_zenith=sp['apparent_zenith'], solar_azimuth=sp['azimuth'],
                    model='perez'
                )
                poa_values = list(poa["poa_global"])
            except Exception as e:
                print(f"PVLib calculation failed: {e}, falling back to geometric")
                raise Exception("PVLib failed")
        else:
            # Geometric fallback calculation
            raise Exception("No PVLib, using geometric")
            
    except:
        # Geometric fallback when pvlib fails
        print("Using geometric tilt/azimuth approximation")
        poa_values = []
        for i, ghi in enumerate(ghi_values):
            # Simple tilt factor approximation
            tilt_factor = 1.0 + (tilt - 30) * 0.008  # ~0.8% per degree deviation from 30°
            
            # Simple azimuth factor (assumes optimal is 180° south)
            azimuth_factor = max(0.7, 1.0 - abs(azimuth - 180) * 0.002)  # Penalty for non-south facing
            
            poa_wm2 = ghi * tilt_factor * azimuth_factor
            poa_values.append(max(0, poa_wm2))  # Ensure non-negative

    # Build result structures  
    hourly_result = []
    daily_poa_sum = 0
    
    for i, time in enumerate(times):
        poa_wm2 = poa_values[i] if i < len(poa_values) else 850
        poa_kwh = poa_wm2 / 1000.0  # Convert W/m² to kWh/m² (hourly assumption)
        daily_poa_sum += poa_kwh
        
        hourly_result.append({
            "dt_utc": time,
            "poa_wm2": poa_wm2,
            "poa_kwh": poa_kwh
        })
    
    # Daily aggregation
    daily_result = [{
        "date": str(times[0]).split('T')[0] if times else "2025-01-02",
        "poa_kwh": daily_poa_sum
    }]
    
    return hourly_result, daily_result