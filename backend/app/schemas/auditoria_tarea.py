from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditoriaTareaBase(BaseModel):
    nombre_tarea: str
    estado: str = "PENDIENTE"
    fecha_inicio: Optional[datetime] = None
    fecha_ejecutada: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    comentario: Optional[str] = None


class AuditoriaTareaCreate(AuditoriaTareaBase):
    pass


class AuditoriaTareaUpdate(BaseModel):
    nombre_tarea: Optional[str] = None
    estado: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_ejecutada: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    comentario: Optional[str] = None


class AuditoriaTareaOut(AuditoriaTareaBase):
    id: int
    auditoria_id: int
    created_at: datetime

    model_config = {"from_attributes": True}