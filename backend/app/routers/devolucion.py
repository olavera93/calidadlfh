from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.devolucion import Devolucion
from app.models.producto import Producto
from app.models.proveedor import Proveedor
from app.schemas.devolucion import (
    DevolucionCreate,
    DevolucionPaginatedResponse,
    DevolucionResponse,
    DevolucionUpdate,
)
from app.services.pdf_devolucion import generar_pdf_devolucion

router = APIRouter(prefix="/devoluciones", tags=["Devoluciones"])


@router.post("/", response_model=DevolucionResponse, status_code=status.HTTP_201_CREATED)
def crear_devolucion(devolucion_in: DevolucionCreate, db: Session = Depends(get_db)):
    # Validar que existan el producto y el proveedor
    producto = db.query(Producto).filter(Producto.id == devolucion_in.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="El producto especificado no existe.")

    proveedor = db.query(Proveedor).filter(Proveedor.id == devolucion_in.proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="El proveedor especificado no existe.")

    nueva_devolucion = Devolucion(**devolucion_in.model_dump())
    db.add(nueva_devolucion)
    db.commit()
    db.refresh(nueva_devolucion)
    return nueva_devolucion


@router.get("/", response_model=DevolucionPaginatedResponse)
def listar_devoluciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Devolucion).options(
        joinedload(Devolucion.producto),
        joinedload(Devolucion.proveedor),
    )

    if estado:
        query = query.filter(Devolucion.estado == estado)

    total = query.count()
    items = query.order_by(Devolucion.id.desc()).offset(skip).limit(limit).all()

    return {"items": items, "total": total}


@router.get("/exportar/pdf", response_class=Response)
def exportar_devoluciones_pdf(
    estado: Optional[str] = Query(None),
    ids: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Devolucion).options(
        joinedload(Devolucion.producto),
        joinedload(Devolucion.proveedor),
    )

    if ids:
        try_ids = [int(i.strip()) for i in ids.split(",") if i.strip().isdigit()]
        if try_ids:
            query = query.filter(Devolucion.id.in_(try_ids))

    if estado:
        query = query.filter(Devolucion.estado == estado)

    devoluciones = query.order_by(Devolucion.id.desc()).all()

    if not devoluciones:
        raise HTTPException(status_code=404, detail="No se encontraron devoluciones para exportar")

    pdf_stream = generar_pdf_devolucion(devoluciones)

    return Response(
        content=pdf_stream.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=formato_devolucion.pdf"},
    )


@router.get("/{devolucion_id}", response_model=DevolucionResponse)
def obtener_devolucion(devolucion_id: int, db: Session = Depends(get_db)):
    devolucion = (
        db.query(Devolucion)
        .options(joinedload(Devolucion.producto), joinedload(Devolucion.proveedor))
        .filter(Devolucion.id == devolucion_id)
        .first()
    )
    if not devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada.")
    return devolucion


@router.put("/{devolucion_id}", response_model=DevolucionResponse)
def actualizar_devolucion(
    devolucion_id: int,
    devolucion_in: DevolucionUpdate,
    db: Session = Depends(get_db),
):
    devolucion = db.query(Devolucion).filter(Devolucion.id == devolucion_id).first()
    if not devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada.")

    update_data = devolucion_in.model_dump(exclude_unset=True)

    # Validar FKs si se intentan actualizar
    if "producto_id" in update_data:
        prod = db.query(Producto).filter(Producto.id == update_data["producto_id"]).first()
        if not prod:
            raise HTTPException(status_code=404, detail="El producto especificado no existe.")

    if "proveedor_id" in update_data:
        prov = db.query(Proveedor).filter(Proveedor.id == update_data["proveedor_id"]).first()
        if not prov:
            raise HTTPException(status_code=404, detail="El proveedor especificado no existe.")

    for field, value in update_data.items():
        setattr(devolucion, field, value)

    db.commit()
    db.refresh(devolucion)
    return devolucion


@router.delete("/{devolucion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_devolucion(devolucion_id: int, db: Session = Depends(get_db)):
    devolucion = db.query(Devolucion).filter(Devolucion.id == devolucion_id).first()
    if not devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada.")

    db.delete(devolucion)
    db.commit()
    return None