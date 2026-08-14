from __future__ import annotations
from typing import List, Optional, TYPE_CHECKING
from pydantic import BaseModel

if TYPE_CHECKING:
    from app.schemas.proveedor import ProveedorSimple


class ProductoBase(BaseModel):
    codigo: str
    nombre: str
    laboratorio: Optional[str] = None
    proveedor_id: Optional[int] = None
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


# Versión "plana" del producto, SIN el campo proveedor.
# Se usa dentro de ProveedorResponse.productos para cortar el ciclo.
class ProductoSimple(ProductoBase):
    id: int

    class Config:
        from_attributes = True


# Versión completa, usada cuando pides un producto directamente
# (trae el proveedor, pero ese proveedor NO vuelve a traer productos)
class ProductoResponse(ProductoBase):
    id: int
    proveedor: Optional["ProveedorSimple"] = None

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


# ── Esquema para Paginación Real (server-side) ─────────────────────────
class ProductoPaginatedResponse(BaseModel):
    items: List[ProductoResponse]
    total: int

class ImportResponse(BaseModel):
    creados: int
    actualizados: int
    nits_no_encontrados: List[str] = []