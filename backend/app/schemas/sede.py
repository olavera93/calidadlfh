from typing import Optional

from pydantic import BaseModel


class SedeCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class SedeUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None


class SedeOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    activa: bool

    model_config = {"from_attributes": True}
