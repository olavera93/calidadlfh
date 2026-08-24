from __future__ import annotations
from pydantic import BaseModel, EmailStr
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.producto import ProductoSimple


class ProveedorBase(BaseModel):
    nombre: str
    identificacion: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo: Optional[EmailStr] = None
    activo: bool = True  # Valor por defecto


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = None
    identificacion: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo: Optional[EmailStr] = None
    activo: Optional[bool] = None  # Permite cambiar a False/True


# Versión "plana" del proveedor, SIN el campo productos.
# Se usa dentro de ProductoResponse.proveedor para cortar el ciclo.
class ProveedorSimple(ProveedorBase):
    id: int

    class Config:
        from_attributes = True


# Versión completa, usada cuando pides un proveedor directamente
# (trae sus productos, pero esos productos NO vuelven a traer el proveedor completo)
class ProveedorResponse(ProveedorBase):
    id: int
    productos: List["ProductoSimple"] = []

    class Config:
        from_attributes = True