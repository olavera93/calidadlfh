from typing import List, Optional
from pydantic import BaseModel
from app.schemas.proveedor import ProveedorResponse


class ProductoBase(BaseModel):
    codigo: str
    nombre: str
    laboratorio: Optional[str] = None
    proveedor_id: int
    registro_sanitario: Optional[str] = None
    estado: Optional[str] = None


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    laboratorio: Optional[str] = None
    proveedor_id: Optional[int] = None
    registro_sanitario: Optional[str] = None
    estado: Optional[str] = None


class ProductoResponse(ProductoBase):
    id: int
    proveedor: Optional[ProveedorResponse] = None

    class Config:
        from_attributes = True


# ── Esquemas para Importación Masiva ──────────────────────────────────
class ProductoImportItem(BaseModel):
    codigo: str
    nombre: str
    laboratorio: Optional[str] = None
    proveedor_id: Optional[int] = None
    proveedor_identificacion: Optional[str] = None
    registro_sanitario: Optional[str] = None
    estado: Optional[str] = None


class ImportResponse(BaseModel):
    creados: int
    actualizados: int