import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.models import Usuario
from app.models.producto import Producto
from app.models.proveedor import Proveedor
from app.schemas.producto import (
    DeleteBulkResponse,
    DeleteBulkSchema,
    ImportResponse,
    ProductoCreate,
    ProductoImportItem,
    ProductoPaginatedResponse,
    ProductoResponse,
    ProductoUpdate,
)

router = APIRouter(prefix="/api/productos", tags=["Productos"])


def normalizar_identificacion(valor) -> str:
    """Deja solo dígitos para emparejar identificaciones."""
    if valor is None:
        return ""
    return re.sub(r"\D", "", str(valor))


@router.get("/", response_model=ProductoPaginatedResponse)
def get_productos(
    skip: int = 0,
    limit: int = Query(default=10, le=100000),
    search: Optional[str] = None,
    proveedor_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Producto).outerjoin(Proveedor, Producto.proveedor_id == Proveedor.id)

    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Producto.nombre.ilike(like),
                Producto.codigo.ilike(like),
                Producto.registro_sanitario.ilike(like),
                Proveedor.nombre.ilike(like),
                Proveedor.identificacion.ilike(like),
            )
        )

    if proveedor_id:
        query = query.filter(Producto.proveedor_id == proveedor_id)

    if estado:
        query = query.filter(Producto.estado == estado)

    total = query.count()

    items = (
        query.options(joinedload(Producto.proveedor))
        .order_by(Producto.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {"items": items, "total": total}


@router.get("/{producto_id}", response_model=ProductoResponse)
def get_producto_by_id(producto_id: int, db: Session = Depends(get_db)):
    producto = (
        db.query(Producto)
        .options(joinedload(Producto.proveedor))
        .filter(Producto.id == producto_id)
        .first()
    )

    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado"
        )

    return producto


@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def create_producto(
    producto: ProductoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "visitador")),
):
    if producto.proveedor_id is not None:
        db_proveedor = db.query(Proveedor).filter(Proveedor.id == producto.proveedor_id).first()
        if not db_proveedor:
            raise HTTPException(status_code=404, detail="El proveedor especificado no existe")

    db_code = db.query(Producto).filter(Producto.codigo == producto.codigo).first()
    if db_code:
        raise HTTPException(status_code=400, detail="Ya existe un producto con este código")

    nuevo_producto = Producto(**producto.model_dump())
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return nuevo_producto


@router.put("/{producto_id}", response_model=ProductoResponse)
def update_producto(
    producto_id: int,
    producto_data: ProductoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "visitador")),
):
    db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_dict = producto_data.model_dump(exclude_unset=True)

    if "proveedor_id" in update_dict and update_dict["proveedor_id"] is not None:
        db_proveedor = (
            db.query(Proveedor).filter(Proveedor.id == update_dict["proveedor_id"]).first()
        )
        if not db_proveedor:
            raise HTTPException(status_code=404, detail="El proveedor especificado no existe")

    for key, value in update_dict.items():
        setattr(db_producto, key, value)

    db.commit()
    db.refresh(db_producto)
    return db_producto


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "visitador")),
):
    db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db.delete(db_producto)
    db.commit()
    return None


@router.post("/importar-json", response_model=ImportResponse)
def importar_productos_json(
    items: List[ProductoImportItem],
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "visitador")),
):
    creados = 0
    actualizados = 0
    nits_no_encontrados = []

    proveedores = db.query(Proveedor).all()
    prov_by_id = {p.id: p.id for p in proveedores}
    prov_by_ident = {
        normalizar_identificacion(p.identificacion): p.id
        for p in proveedores
        if p.identificacion
    }

    for item in items:
        target_prov_id = None
        nit_normalizado = normalizar_identificacion(item.proveedor_identificacion)

        if item.proveedor_id and item.proveedor_id in prov_by_id:
            target_prov_id = item.proveedor_id
        elif nit_normalizado and nit_normalizado in prov_by_ident:
            target_prov_id = prov_by_ident[nit_normalizado]
        elif nit_normalizado:
            nits_no_encontrados.append(item.proveedor_identificacion)

        existente = db.query(Producto).filter(Producto.codigo == item.codigo).first()

        if existente:
            existente.nombre = item.nombre
            if item.laboratorio is not None:
                existente.laboratorio = item.laboratorio
            if item.registro_sanitario is not None:
                existente.registro_sanitario = item.registro_sanitario
            if item.estado is not None:
                existente.estado = item.estado
            if target_prov_id is not None:
                existente.proveedor_id = target_prov_id
            actualizados += 1
        else:
            nuevo = Producto(
                codigo=item.codigo,
                nombre=item.nombre,
                laboratorio=item.laboratorio,
                registro_sanitario=item.registro_sanitario,
                estado=item.estado or "ACTIVO",
                proveedor_id=target_prov_id,
            )
            db.add(nuevo)
            creados += 1

    db.commit()
    return {
        "creados": creados,
        "actualizados": actualizados,
        "nits_no_encontrados": nits_no_encontrados,
    }


@router.post("/eliminar-masivo", response_model=DeleteBulkResponse)
def delete_productos_masivo(
    payload: DeleteBulkSchema,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "visitador")),
):
    if not payload.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un ID para eliminar",
        )

    eliminados = (
        db.query(Producto)
        .filter(Producto.id.in_(payload.ids))
        .delete(synchronize_session=False)
    )

    db.commit()

    return {
        "eliminados": eliminados,
        "mensaje": f"Se eliminaron {eliminados} productos correctamente.",
    }