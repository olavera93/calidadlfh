import os
import mimetypes
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import require_roles
from app.models.models import Usuario

from app.database import get_db
from app.models.auditoria import Auditoria
from app.schemas.auditoria import AuditoriaCreate, AuditoriaUpdate, AuditoriaOut

router = APIRouter(
    prefix="/api/auditorias",
    tags=["Auditorias"]
)

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "storage",
    "auditorias"
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/", response_model=List[AuditoriaOut])
def get_auditorias(
    skip: int = 0,
    limit: int = 100,
    estado: Optional[str] = None,  # Permite filtrar por estado (programada, en_progreso, finalizada, cancelada)
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Auditoria).options(
        joinedload(Auditoria.sede),
        joinedload(Auditoria.tareas)
    )
    if estado is not None:
        query = query.filter(Auditoria.estado == estado)
    if sede_id is not None:
        query = query.filter(Auditoria.sede_id == sede_id)

    return query.offset(skip).limit(limit).all()


@router.get("/{auditoria_id}", response_model=AuditoriaOut)
def get_auditoria(auditoria_id: int, db: Session = Depends(get_db)):
    db_auditoria = db.query(Auditoria).options(
        joinedload(Auditoria.sede),
        joinedload(Auditoria.tareas)
    ).filter(Auditoria.id == auditoria_id).first()

    if not db_auditoria:
        raise HTTPException(
            status_code=404,
            detail="Auditoría no encontrada"
        )

    return db_auditoria


@router.post("/", response_model=AuditoriaOut, status_code=status.HTTP_201_CREATED)
def create_auditoria(
    auditoria: AuditoriaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user", "visitador"))
):
    data = auditoria.model_dump(exclude={"tareas"})
    nueva_auditoria = Auditoria(**data)

    # Crea las tareas asociadas si se enviaron junto con la auditoría
    if auditoria.tareas:
        from app.models.auditoria_tarea import AuditoriaTarea
        nueva_auditoria.tareas = [AuditoriaTarea(**t.model_dump()) for t in auditoria.tareas]

    db.add(nueva_auditoria)
    db.commit()
    db.refresh(nueva_auditoria)
    return nueva_auditoria


@router.put("/{auditoria_id}", response_model=AuditoriaOut)
def update_auditoria(
    auditoria_id: int,
    auditoria_data: AuditoriaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user", "visitador"))
):
    db_auditoria = db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    if not db_auditoria:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")

    update_dict = auditoria_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_auditoria, key, value)

    db.commit()
    db.refresh(db_auditoria)
    return db_auditoria


@router.delete("/{auditoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_auditoria(
    auditoria_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user", "visitador"))
):
    db_auditoria = db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    if not db_auditoria:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")

    db.delete(db_auditoria)
    db.commit()

    return None


@router.post("/{auditoria_id}/documento", response_model=AuditoriaOut)
async def upload_documento_auditoria(
    auditoria_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user", "visitador")),
):
    """
    Sube cualquier tipo de archivo como documento/agregado de la auditoría
    sin restricción de formato ni de tamaño (se guarda mediante streaming).
    """
    db_auditoria = db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    if not db_auditoria:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")

    target_dir = os.path.join(UPLOAD_DIR, str(auditoria_id))
    os.makedirs(target_dir, exist_ok=True)

    # Eliminar archivo anterior si existía
    if db_auditoria.documento_adt:
        old_path = os.path.join(target_dir, db_auditoria.documento_adt)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    nombre_archivo = archivo.filename or f"documento_{auditoria_id}"
    file_path = os.path.join(target_dir, nombre_archivo)

    # Guardar en chunks sin restricción de tamaño ni tipo
    with open(file_path, "wb") as buffer:
        while chunk := await archivo.read(1024 * 1024):  # Chunks de 1MB
            buffer.write(chunk)

    db_auditoria.documento_adt = nombre_archivo
    db.commit()
    db.refresh(db_auditoria)
    return db_auditoria


@router.get("/{auditoria_id}/documento")
def get_documento_auditoria(auditoria_id: int, db: Session = Depends(get_db)):
    """
    Permite visualizar o descargar el archivo/agregado de la auditoría.
    """
    db_auditoria = db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    if not db_auditoria:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")

    if not db_auditoria.documento_adt:
        raise HTTPException(status_code=404, detail="La auditoría no tiene ningún archivo cargado")

    file_path = os.path.join(UPLOAD_DIR, str(auditoria_id), db_auditoria.documento_adt)
    if not os.path.exists(file_path):
        alt_path = os.path.join(UPLOAD_DIR, db_auditoria.documento_adt)
        if os.path.exists(alt_path):
            file_path = alt_path
        else:
            raise HTTPException(status_code=404, detail="Archivo físico no encontrado en el servidor")

    media_type, _ = mimetypes.guess_type(file_path)
    media_type = media_type or "application/octet-stream"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=db_auditoria.documento_adt,
        headers={"Content-Disposition": f'inline; filename="{db_auditoria.documento_adt}"'},
    )


@router.delete("/{auditoria_id}/documento", response_model=AuditoriaOut)
def delete_documento_auditoria(
    auditoria_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user", "visitador")),
):
    """
    Elimina el archivo físico y desasocia el documento de la auditoría.
    """
    db_auditoria = db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    if not db_auditoria:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")

    if db_auditoria.documento_adt:
        file_path = os.path.join(UPLOAD_DIR, str(auditoria_id), db_auditoria.documento_adt)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        db_auditoria.documento_adt = None
        db.commit()
        db.refresh(db_auditoria)

    return db_auditoria