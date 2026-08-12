import os
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
from app.schemas.documento import DocumentoResponse

router = APIRouter(
    prefix="/documentos",
    tags=["documentos"]
)

# ── Configuración base ──────────────────────────────────────────────
UPLOAD_DIR = "storage/documentos"

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


def guardar_archivo_fisico(
    archivo: UploadFile,
    contenido: bytes,
    proveedor_id: Optional[int] = None,
    producto_id: Optional[int] = None
) -> str:
    """
    Determina la subcarpeta (proveedores o productos), asegura su existencia,
    y guarda el archivo preservando su nombre original evitando sobreescrituras.
    """
    # 1. Determinar la subcarpeta
    if proveedor_id:
        subcarpeta = "proveedores"
    elif producto_id:
        subcarpeta = "productos"
    else:
        subcarpeta = "general"

    directorio_destino = os.path.join(UPLOAD_DIR, subcarpeta)
    os.makedirs(directorio_destino, exist_ok=True)

    # 2. Mantener el nombre original subido por el usuario
    nombre_original = archivo.filename
    nombre_base, ext = os.path.splitext(nombre_original)

    ruta_completa = os.path.join(directorio_destino, nombre_original)

    # 3. Control de colisión para no sobreescribir archivos existentes con el mismo nombre
    counter = 1
    while os.path.exists(ruta_completa):
        nuevo_nombre = f"{nombre_base}_{counter}{ext}"
        ruta_completa = os.path.join(directorio_destino, nuevo_nombre)
        counter += 1

    # 4. Guardar archivo en el disco
    with open(ruta_completa, "wb") as f:
        f.write(contenido)

    return ruta_completa


@router.get("/", response_model=List[DocumentoResponse])
def get_documentos(db: Session = Depends(get_db)):
    return db.query(Documento).all()


@router.get("/{documento_id}", response_model=DocumentoResponse)
def get_documento(documento_id: int, db: Session = Depends(get_db)):
    documento = db.query(Documento).filter(Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )
    return documento


@router.get("/{documento_id}/ver")
def ver_documento(documento_id: int, db: Session = Depends(get_db)):
    doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    if not doc.ruta_archivo or not os.path.exists(doc.ruta_archivo):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    media_type = doc.mime_type
    if not media_type:
        guessed_type, _ = mimetypes.guess_type(doc.ruta_archivo)
        media_type = guessed_type or "application/octet-stream"

    extension_real = os.path.splitext(doc.ruta_archivo)[1]
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
    etiquetas: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if archivo.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

    contenido = await archivo.read()
    if len(contenido) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="El archivo supera los 10MB")

    # Guardar en storage/documentos/productos o storage/documentos/proveedores manteniendo el nombre
    ruta_completa = guardar_archivo_fisico(
        archivo=archivo,
        contenido=contenido,
        proveedor_id=proveedor_id,
        producto_id=producto_id
    )

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
async def update_documento(
    documento_id: int,
    nombre_docu: str = Form(...),
    producto_id: Optional[int] = Form(None),
    proveedor_id: Optional[int] = Form(None),
    etiquetas: Optional[str] = Form(None),
    archivo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )

    doc.nombre_docu = nombre_docu
    doc.producto_id = producto_id
    doc.proveedor_id = proveedor_id

    try:
        doc.etiquetas = json.loads(etiquetas) if etiquetas else []
    except json.JSONDecodeError:
        doc.etiquetas = []

    # Reemplazo de archivo si se envía uno nuevo
    if archivo is not None:
        if archivo.content_type not in ALLOWED_MIME:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

        contenido = await archivo.read()
        if len(contenido) > MAX_SIZE:
            raise HTTPException(status_code=400, detail="El archivo supera los 10MB")

        # Borrar el archivo anterior del disco si existía
        if doc.ruta_archivo and os.path.exists(doc.ruta_archivo):
            os.remove(doc.ruta_archivo)

        # Guardar en la carpeta correspondiente con el nuevo nombre
        ruta_completa = guardar_archivo_fisico(
            archivo=archivo,
            contenido=contenido,
            proveedor_id=proveedor_id,
            producto_id=producto_id
        )

        doc.ruta_archivo = ruta_completa
        doc.mime_type = archivo.content_type

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_documento(documento_id: int, db: Session = Depends(get_db)):
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
    creados = 0
    actualizados = 0

    for item in documentos_data:
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