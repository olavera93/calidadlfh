from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

# Importar directamente las clases para que estén disponibles en runtime
from app.schemas.producto import ProductoSimple
from app.schemas.proveedor import ProveedorSimple


class DevolucionBase(BaseModel):
    producto_id: int
    proveedor_id: int
    forma_farmaceutica: Optional[str] = None
    lote: str
    fecha_de_vencimiento: Optional[date] = None
    registrosanitario: Optional[str] = None
    cantidad: int
    causa: Optional[str] = None
    observaciones: Optional[str] = None
    quien_recibe: Optional[str] = None
    quien_entrega: Optional[str] = None
    numero_de_formato: Optional[str] = None
    estado: Optional[str] = "Pendiente"


class DevolucionCreate(DevolucionBase):
    pass


class DevolucionUpdate(BaseModel):
    producto_id: Optional[int] = None
    proveedor_id: Optional[int] = None
    forma_farmaceutica: Optional[str] = None
    lote: Optional[str] = None
    fecha_de_vencimiento: Optional[date] = None
    registrosanitario: Optional[str] = None
    cantidad: Optional[int] = None
    causa: Optional[str] = None
    observaciones: Optional[str] = None
    quien_recibe: Optional[str] = None
    quien_entrega: Optional[str] = None
    numero_de_formato: Optional[str] = None
    estado: Optional[str] = None


class DevolucionResponse(DevolucionBase):
    id: int
    fecha_creacion: datetime
    
    # Se usan directamente los esquemas importados
    producto: Optional[ProductoSimple] = None
    proveedor: Optional[ProveedorSimple] = None

    class Config:
        from_attributes = True


class DevolucionPaginatedResponse(BaseModel):
    items: list[DevolucionResponse]
    total: int


# Reconstruir el modelo para asegurar la resolución de esquemas anidados
DevolucionResponse.model_rebuild()