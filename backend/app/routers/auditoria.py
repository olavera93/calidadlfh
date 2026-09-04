from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.dependencies import require_roles
from app.models.models import Usuario

from app.database import get_db
from app.models.auditoria import Auditoria
from app.schemas.auditoria import AuditoriaCreate, AuditoriaUpdate, AuditoriaOut

router = APIRouter(
    prefix="/api/auditorias",
    tags=["Auditorias"]
)


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
    _: Usuario = Depends(require_roles("admin", "visitador"))
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
    _: Usuario = Depends(require_roles("admin", "visitador"))
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
    _: Usuario = Depends(require_roles("admin", "visitador"))
):
    db_auditoria = db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    if not db_auditoria:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")

    db.delete(db_auditoria)
    db.commit()

    return None