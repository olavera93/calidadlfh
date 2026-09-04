from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.sede import SedeOut


class AuditoriaCreate(BaseModel):
    nombre_auditor: str
    sede_id: int
    documento_adt: Optional[str] = None
    estado: str
    fecha_auditoria: datetime


class AuditoriaUpdate(BaseModel):
    nombre_auditor: Optional[str] = None
    sede_id: Optional[int] = None
    documento_adt: Optional[str] = None
    estado: Optional[str] = None
    fecha_auditoria: Optional[datetime] = None


class AuditoriaOut(BaseModel):
    id: int
    nombre_auditor: str
    documento_adt: Optional[str] = None
    estado: str
    fecha_auditoria: datetime
    sede: SedeOut

    model_config = {"from_attributes": True}