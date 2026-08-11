from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.documento import Documento
from app.models.producto import Producto
from app.models.proveedor import Proveedor
from app.schemas.documento import DocumentoCreate, DocumentoResponse

router = APIRouter(
    prefix="/documentos",
    tags=["documentos"]
)

@router.get("/", response_model=List[DocumentoResponse])
def get_documentos(db: Session = Depends(get_db)):
    """Obtiene la lista completa de documentos con sus productos y proveedores asociados."""
    return db.query(Documento).all()

@router.get("/{documento_id}", response_model=DocumentoResponse)
def get_documento(documento_id: int, db: Session = Depends(get_db)):
    """Obtiene un documento por su ID."""
    documento = db.query(Documento).filter(Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )
    return documento

@router.post("/", response_model=DocumentoResponse, status_code=status.HTTP_201_CREATED)
def create_documento(documento_in: DocumentoCreate, db: Session = Depends(get_db)):
    """Crea un nuevo documento asociándolo a producto/proveedor si se especifican."""
    new_doc = Documento(
        nombre_docu=documento_in.nombre_docu,
        producto_id=documento_in.producto_id,
        proveedor_id=documento_in.proveedor_id,
        etiquetas=documento_in.etiquetas
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

@router.put("/{documento_id}", response_model=DocumentoResponse)
def update_documento(documento_id: int, documento_in: DocumentoCreate, db: Session = Depends(get_db)):
    """Actualiza la información de un documento existente."""
    doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )
    
    doc.nombre_docu = documento_in.nombre_docu
    doc.producto_id = documento_in.producto_id
    doc.proveedor_id = documento_in.proveedor_id
    doc.etiquetas = documento_in.etiquetas

    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_documento(documento_id: int, db: Session = Depends(get_db)):
    """Elimina un documento de la base de datos."""
    doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )
    
    db.delete(doc)
    db.commit()
    return None

@router.post("/importar-json")
def importar_documentos_json(documentos_data: List[dict], db: Session = Depends(get_db)):
    """Procesa e importa registros masivos desde Excel cargados por el frontend."""
    creados = 0
    actualizados = 0

    for item in documentos_data:
        # Se soporta 'nombre_docu' o 'nombre' por compatibilidad con la carga del JSON/Excel
        nombre_docu = item.get("nombre_docu") or item.get("nombre")
        if not nombre_docu:
            continue

        prod_codigo = item.get("producto_codigo")
        producto = db.query(Producto).filter(Producto.codigo == prod_codigo).first() if prod_codigo else None

        prov_nombre = item.get("proveedor_nombre")
        proveedor = db.query(Proveedor).filter(Proveedor.nombre == prov_nombre).first() if prov_nombre else None

        existente = db.query(Documento).filter(Documento.nombre_docu == nombre_docu).first()

        if existente:
            existente.producto_id = producto.id if producto else existente.producto_id
            existente.proveedor_id = proveedor.id if proveedor else existente.proveedor_id
            existente.etiquetas = item.get("etiquetas", existente.etiquetas)
            actualizados += 1
        else:
            nuevo_doc = Documento(
                nombre_docu=nombre_docu,
                producto_id=producto.id if producto else None,
                proveedor_id=proveedor.id if proveedor else None,
                etiquetas=item.get("etiquetas", [])
            )
            db.add(nuevo_doc)
            creados += 1

    db.commit()
    return {"creados": creados, "actualizados": actualizados}