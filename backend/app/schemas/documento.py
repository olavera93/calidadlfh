from typing import List, Optional
from pydantic import BaseModel


# Esquema para crear/editar
class DocumentoCreate(BaseModel):
    nombre_docu: str
    producto_id: Optional[int] = None
    proveedor_id: Optional[int] = None
    etiquetas: Optional[List[str]] = []


# Esquema simple para mostrar producto anidado (mantiene 'nombre' propio del Producto)
class ProductoNested(BaseModel):
    id: int
    nombre: str
    laboratorio: Optional[str] = None

    class Config:
        from_attributes = True


# Esquema simple para mostrar proveedor anidado (mantiene 'nombre' propio del Proveedor)
class ProveedorNested(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True


# Esquema de respuesta completo
class DocumentoResponse(BaseModel):
    id: int
    nombre_docu: str
    producto_id: Optional[int]
    proveedor_id: Optional[int]
    etiquetas: Optional[List[str]]
    producto: Optional[ProductoNested]
    proveedor: Optional[ProveedorNested]

    class Config:
        from_attributes = True