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
    
    # Nuevos campos opcionales
    terminos: Optional[str] = None
    banco: Optional[str] = None
    cuenta: Optional[str] = None
    
    activo: bool = True  # Valor por defecto


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = None
    identificacion: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo: Optional[EmailStr] = None
    
    # Campos opcionales para la actualización
    terminos: Optional[str] = None
    banco: Optional[str] = None
    cuenta: Optional[str] = None
    
    activo: Optional[bool] = None  # Permite cambiar a False/True


# Versión "plana" del proveedor, SIN el campo productos.
class ProveedorSimple(ProveedorBase):
    id: int

    class Config:
        from_attributes = True


# Versión completa
class ProveedorResponse(ProveedorBase):
    id: int
    productos: List["ProductoSimple"] = []

    class Config:
        from_attributes = True