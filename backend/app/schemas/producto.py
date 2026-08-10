from pydantic import BaseModel
from typing import Optional, List
from app.schemas.proveedor import ProveedorResponse


class ProductoBase(BaseModel):
    codigo: str
    nombre: str
    laboratorio: Optional[str] = None
    proveedor_id: int


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    laboratorio: Optional[str] = None
    proveedor_id: Optional[int] = None


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


class ImportResponse(BaseModel):
    creados: int
    actualizados: int