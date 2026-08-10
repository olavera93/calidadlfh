from pydantic import BaseModel, EmailStr
from typing import Optional, List

class ProveedorBase(BaseModel):
    nombre: str
    identificacion: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo: Optional[EmailStr] = None

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = None
    identificacion: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo: Optional[EmailStr] = None

class ProveedorResponse(ProveedorBase):
    id: int

    class Config:
        from_attributes = True