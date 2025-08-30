# Pydantic schemas for ML service
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union

class TariffRate(BaseModel):
    price: float = Field(..., description="Rate in $/kWh")
    start: str = Field(..., description="Start time HH:MM")
    end: str = Field(..., description="End time HH:MM")

class Tariff(BaseModel):
    import_rates: List[TariffRate] = Field(alias="import")
    export_rates: Optional[List[TariffRate]] = Field(None, alias="export")
    demand_rates: Optional[List[TariffRate]] = Field(None, alias="demand")

class CommonInput(BaseModel):
    usage_30min: List[float] = Field(..., description="30-min usage data (>=180 days)")
    pv_estimate_30min: Optional[List[float]] = Field(None, description="PV generation estimates")
    tariff: Tariff
    shading_index: float = Field(0.1, ge=0, le=1, description="Shading factor 0-1")

class ROIInput(CommonInput):
    roof_params: Optional[Dict[str, Any]] = None
    system_size_kw: Optional[float] = Field(None, gt=0)

class BatteryROIInput(CommonInput):
    battery_params: Dict[str, Any] = Field(..., description="Battery specifications")
    system_size_kw: float = Field(..., gt=0)

class ForecastInput(BaseModel):
    usage_30min: List[float]
    weather_data: Optional[Dict[str, Any]] = None
    seasonal_adjustment: bool = True

class TrainRequest(BaseModel):
    task: str = Field(..., description="Training task: roi|forecast|dispatch")
    dataset: Dict[str, Any] = Field(..., description="Training dataset")
    seed: Optional[int] = Field(1337, description="Random seed")
    hyperparams: Optional[Dict[str, Any]] = Field({}, description="Model hyperparameters")

class PredictRequest(BaseModel):
    task: str = Field(..., description="Prediction task: solar_roi|battery_roi|forecast")
    input: Union[ROIInput, BatteryROIInput, ForecastInput] = Field(..., description="Input data")

class PredictionResponse(BaseModel):
    value: Dict[str, Any] = Field(..., description="Prediction results")
    conf: Dict[str, Any] = Field(..., description="Confidence intervals")
    sourceModel: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    telemetry: Optional[Dict[str, float]] = Field(None, description="Performance telemetry")

# Output schemas
class ROIOutput(BaseModel):
    annual_savings_AUD: float
    system_size_kw: float
    conf: Dict[str, float]  # p50, p90

class BatteryROIOutput(BaseModel):
    annual_savings_AUD: float
    payback_years: float
    cycle_schedule: List[Dict[str, Any]]
    total_export_kwh: float
    bill_delta_AUD: float
    backup_hours_p50: float

class ForecastOutput(BaseModel):
    forecast_kwh: List[float]
    confidence_bands: Dict[str, List[float]]  # p10, p50, p90