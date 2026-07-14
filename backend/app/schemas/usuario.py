from typing import Optional

from pydantic import BaseModel


class UsuarioCreate(BaseModel):
    nombre: str
    username: str
    password: str
    rol: str = "user"
    sedes: list[int] = []


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    sedes: Optional[list[int]] = None


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    username: str
    rol: str
    activo: bool
    sedes: list[int] = []

    model_config = {"from_attributes": True}
