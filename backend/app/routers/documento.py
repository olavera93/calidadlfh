import os
import uuid
import json
import mimetypes
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
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

# ── Configuración de almacenamiento de archivos ──────────────────────
UPLOAD_DIR = "storage/documentos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


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


@router.get("/{documento_id}/ver")
def ver_documento(documento_id: int, db: Session = Depends(get_db)):
    """Sirve el archivo para visualizarlo directamente en el navegador (inline, sin forzar descarga)."""
    doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    if not doc.ruta_archivo or not os.path.exists(doc.ruta_archivo):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Fallback: si mime_type no está guardado (documentos creados antes de este campo,
    # o casos donde llegó vacío), se infiere a partir de la extensión del archivo.
    media_type = doc.mime_type
    if not media_type:
        guessed_type, _ = mimetypes.guess_type(doc.ruta_archivo)
        media_type = guessed_type or "application/octet-stream"

    # El nombre que el usuario escribió (doc.nombre_docu) puede no tener extensión.
    # Para que el navegador muestre el ícono correcto y guarde el archivo con la
    # extensión adecuada, se toma la extensión real del archivo en disco.
    extension_real = os.path.splitext(doc.ruta_archivo)[1]  # incluye el punto, ej: ".pdf"
    nombre_base = doc.nombre_docu
    if extension_real and not nombre_base.lower().endswith(extension_real.lower()):
        nombre_descarga = f"{nombre_base}{extension_real}"
    else:
        nombre_descarga = nombre_base

    return FileResponse(
        path=doc.ruta_archivo,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{nombre_descarga}"'},
    )


@router.post("/", response_model=DocumentoResponse, status_code=status.HTTP_201_CREATED)
async def create_documento(
    nombre_docu: str = Form(...),
    producto_id: Optional[int] = Form(None),
    proveedor_id: Optional[int] = Form(None),
    etiquetas: Optional[str] = Form(None),  # llega como JSON string desde el frontend
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Crea un nuevo documento con archivo adjunto, asociándolo a producto/proveedor si se especifican."""

    if archivo.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

    contenido = await archivo.read()
    if len(contenido) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="El archivo supera los 10MB")

    ext = os.path.splitext(archivo.filename)[1]
    nombre_unico = f"{uuid.uuid4().hex}{ext}"
    ruta_completa = os.path.join(UPLOAD_DIR, nombre_unico)

    with open(ruta_completa, "wb") as f:
        f.write(contenido)

    try:
        etiquetas_list = json.loads(etiquetas) if etiquetas else []
    except json.JSONDecodeError:
        etiquetas_list = []

    new_doc = Documento(
        nombre_docu=nombre_docu,
        producto_id=producto_id,
        proveedor_id=proveedor_id,
        etiquetas=etiquetas_list,
        ruta_archivo=ruta_completa,
        mime_type=archivo.content_type,
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc


@router.put("/{documento_id}", response_model=DocumentoResponse)
def update_documento(documento_id: int, documento_in: DocumentoCreate, db: Session = Depends(get_db)):
    """Actualiza la información de un documento existente (sin reemplazar el archivo)."""
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
    """Elimina un documento de la base de datos y su archivo físico asociado."""
    doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )

    if doc.ruta_archivo and os.path.exists(doc.ruta_archivo):
        os.remove(doc.ruta_archivo)

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