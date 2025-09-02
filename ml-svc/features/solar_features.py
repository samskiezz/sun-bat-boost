import pandas as pd
import numpy as np
import pvlib


def compute_poa(lat, lng, tilt, azimuth, df_hourly: pd.DataFrame):
    """Compute plane-of-array irradiance using pvlib.
    
    Args:
        lat, lng: Site coordinates
        tilt: Panel tilt angle (degrees)
        azimuth: Panel azimuth (degrees, 180=south)
        df_hourly: DataFrame with dt_utc, DNI, DHI, GHI columns
    
    Returns:
        tuple: (hourly_df, daily_df) with POA calculations
    """
    # Solar position
    times = pd.to_datetime(df_hourly["dt_utc"])
    sp = pvlib.solarposition.get_solarposition(times=times, latitude=lat, longitude=lng)
    
    dni = df_hourly["DNI"].astype(float)
    dhi = df_hourly["DHI"].astype(float)
    ghi = df_hourly["GHI"].astype(float)

    # Extra-terrestrial irradiance
    dni_extra = pvlib.irradiance.get_extra_radiation(times)
    airmass = pvlib.atmosphere.get_relative_airmass(sp['apparent_zenith'])
    
    # POA calculation using Perez model
    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=tilt,
        surface_azimuth=azimuth,
        dni=dni,
        ghi=ghi,
        dhi=dhi,
        dni_extra=dni_extra,
        airmass=airmass,
        solar_zenith=sp['apparent_zenith'],
        solar_azimuth=sp['azimuth'],
        model='perez'
    )
    
    # Hourly dataframe
    df = pd.DataFrame({
        "dt_utc": times,
        "poa_wm2": poa["poa_global"]
    })
    df["poa_kwh"] = df["poa_wm2"] * 1.0 / 1000.0  # W/m² to kWh/m² per hour
    
    # Daily aggregation
    daily = df.set_index("dt_utc")["poa_kwh"].resample("D").sum().reset_index()
    daily["date"] = daily["dt_utc"].dt.date.astype(str)
    daily = daily[["date", "poa_kwh"]]
    
    return df, daily