from pydantic import BaseModel, EmailStr
from typing import Optional

class ContactoBase(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    correo: Optional[EmailStr] = None
    cargo: Optional[str] = None
    observaciones: Optional[str] = None
    proveedor_id: int

class ContactoCreate(ContactoBase):
    pass

class ContactoUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[EmailStr] = None
    cargo: Optional[str] = None
    observaciones: Optional[str] = None
    proveedor_id: Optional[int] = None

class ContactoResponse(ContactoBase):
    id: int

    class Config:
        from_attributes = True