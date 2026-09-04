from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.schemas.auditoria_tarea import AuditoriaTareaCreate, AuditoriaTareaOut
from app.schemas.sede import SedeOut


class AuditoriaBase(BaseModel):
    nombre_auditoria: str
    nombre_auditor: str
    sede_id: int
    documento_adt: Optional[str] = None
    estado: str
    fecha_programada: datetime
    fecha_ejecucion: Optional[datetime] = None
    fecha_finalizada: Optional[datetime] = None
    novedades: Optional[str] = None


class AuditoriaCreate(AuditoriaBase):
    # Opcional: permite crear tareas al mismo tiempo que se crea la auditoría
    tareas: Optional[List[AuditoriaTareaCreate]] = []


class AuditoriaUpdate(BaseModel):
    nombre_auditoria: Optional[str] = None
    nombre_auditor: Optional[str] = None
    sede_id: Optional[int] = None
    documento_adt: Optional[str] = None
    estado: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    fecha_ejecucion: Optional[datetime] = None
    fecha_finalizada: Optional[datetime] = None
    novedades: Optional[str] = None


class AuditoriaOut(AuditoriaBase):
    id: int
    created_at: datetime
    sede: SedeOut
    tareas: List[AuditoriaTareaOut] = []

    model_config = {"from_attributes": True}