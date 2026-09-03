from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel


class AreaCreate(BaseModel):
    nombre: str
    tipo: Optional[str] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    humedad_min: Optional[float] = None
    humedad_max: Optional[float] = None


class AreaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    humedad_min: Optional[float] = None
    humedad_max: Optional[float] = None
    activa: Optional[bool] = None


class AreaOut(BaseModel):
    id: int
    sede_id: int
    nombre: str
    tipo: Optional[str] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    humedad_min: Optional[float] = None
    humedad_max: Optional[float] = None
    activa: bool

    model_config = {"from_attributes": True}


class RegistroCreate(BaseModel):
    area_id: int
    temperatura: float
    humedad: Optional[float] = None
    fecha: date
    hora: time
    observaciones: Optional[str] = None


class RegistroUpdate(BaseModel):
    temperatura: Optional[float] = None
    humedad: Optional[float] = None
    observaciones: Optional[str] = None


class RegistroOut(BaseModel):
    id: int
    area_id: int
    area_nombre: str
    sede_id: int
    sede_nombre: str
    temperatura: float
    humedad: Optional[float] = None
    fecha: date
    hora: time
    usuario_id: int
    usuario_nombre: str
    observaciones: Optional[str] = None
    created_at: datetime
    alerta: bool

    model_config = {"from_attributes": True}


class ReporteTemperaturasRequest(BaseModel):
    area_id: int
    year_month: str  # formato "YYYY-MM"
    temp_chart_base64: str
    hum_chart_base64: Optional[str] = None