from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OdooSettingsBase(BaseModel):
    url: str
    database: str
    username: str


class OdooSettingsCreate(OdooSettingsBase):
    password: Optional[str] = None


class OdooSettingsUpdate(BaseModel):
    url: Optional[str] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class OdooSettingsOut(OdooSettingsBase):
    id: int
    uid: int
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RecepcionItem(BaseModel):
    fecha: str
    origen: str
    destino: str
    proveedor: str
    orden: str
    factura: str
    orden_inferida: bool
    producto: str
    lote: str
    vencimiento: str
    cantidad: float


class VencimientoItem(BaseModel):
    vencimiento: str
    dias: Optional[int]
    producto: str
    lote: str
    ubicacion: str
    cantidad: float


class OdooTestResult(BaseModel):
    ok: bool
    mensaje: str
    uid: Optional[int] = None
