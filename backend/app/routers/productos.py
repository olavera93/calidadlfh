from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.producto import Producto
from app.models.proveedor import Proveedor
from app.schemas.producto import (
    ProductoCreate, 
    ProductoUpdate, 
    ProductoResponse, 
    ProductoImportItem,
    ImportResponse
)

router = APIRouter(
    prefix="/api/productos",
    tags=["Productos"]
)

@router.get("/", response_model=List[ProductoResponse])
def get_productos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Producto).offset(skip).limit(limit).all()

@router.get("/{producto_id}", response_model=ProductoResponse)
def get_producto(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return db_producto

@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def create_producto(producto: ProductoCreate, db: Session = Depends(get_db)):
    # Validar que exista el proveedor
    db_proveedor = db.query(Proveedor).filter(Proveedor.id == producto.proveedor_id).first()
    if not db_proveedor:
        raise HTTPException(status_code=404, detail="El proveedor especificado no existe")

    # Validar código único
    db_code = db.query(Producto).filter(Producto.codigo == producto.codigo).first()
    if db_code:
        raise HTTPException(status_code=400, detail="Ya existe un producto con este código")

    nuevo_producto = Producto(**producto.model_dump())
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return nuevo_producto

@router.put("/{producto_id}", response_model=ProductoResponse)
def update_producto(producto_id: int, producto_data: ProductoUpdate, db: Session = Depends(get_db)):
    db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_dict = producto_data.model_dump(exclude_unset=True)

    if "proveedor_id" in update_dict:
        db_proveedor = db.query(Proveedor).filter(Proveedor.id == update_dict["proveedor_id"]).first()
        if not db_proveedor:
            raise HTTPException(status_code=404, detail="El proveedor especificado no existe")

    for key, value in update_dict.items():
        setattr(db_producto, key, value)

    db.commit()
    db.refresh(db_producto)
    return db_producto

@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db.delete(db_producto)
    db.commit()
    return None

# ── Endpoint para importación masiva en lote ───────────────────────────
@router.post("/importar-json", response_model=ImportResponse)
def importar_productos_json(items: List[ProductoImportItem], db: Session = Depends(get_db)):
    creados = 0
    actualizados = 0

    # Precargar proveedores en memoria (Mapeo ID e Identificación) para optimizar consultas
    proveedores = db.query(Proveedor).all()
    prov_by_id = {p.id: p.id for p in proveedores}
    prov_by_ident = {str(p.identificacion): p.id for p in proveedores if p.identificacion}

    for item in items:
        # Resolver el proveedor_id
        target_prov_id = None
        if item.proveedor_id and item.proveedor_id in prov_by_id:
            target_prov_id = item.proveedor_id
        elif item.proveedor_identificacion and str(item.proveedor_identificacion) in prov_by_ident:
            target_prov_id = prov_by_ident[str(item.proveedor_identificacion)]

        # Búsqueda por código para determinar si se crea o actualiza (Upsert)
        existente = db.query(Producto).filter(Producto.codigo == item.codigo).first()

        if existente:
            existente.nombre = item.nombre
            if item.laboratorio is not None:
                existente.laboratorio = item.laboratorio
            if target_prov_id is not None:
                existente.proveedor_id = target_prov_id
            actualizados += 1
        else:
            nuevo = Producto(
                codigo=item.codigo,
                nombre=item.nombre,
                laboratorio=item.laboratorio,
                proveedor_id=target_prov_id
            )
            db.add(nuevo)
            creados += 1

    db.commit()
    return {"creados": creados, "actualizados": actualizados}