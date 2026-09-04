from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_sedes_permitidas,
    require_admin,
    require_roles,
)
from app.database import get_db
from app.models.auditoria import Auditoria
from app.models.auditoria_tarea import AuditoriaTarea
from app.models.models import Usuario
from app.schemas.auditoria_tarea import (
    AuditoriaTareaCreate,
    AuditoriaTareaOut,
    AuditoriaTareaUpdate,
)

router = APIRouter(prefix="/auditorias", tags=["Tareas de Auditoría"])


# Helper para validar acceso a la auditoría padre
def _get_auditoria_validada(
    auditoria_id: int, db: Session, sedes_permitidas: list[int]
) -> Auditoria:
    auditoria = (
        db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    )
    if not auditoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Auditoría no encontrada",
        )
    if auditoria.sede_id not in sedes_permitidas:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a la sede de esta auditoría",
        )
    return auditoria


@router.get(
    "/{auditoria_id}/tareas", response_model=list[AuditoriaTareaOut]
)
def list_tareas(
    auditoria_id: int,
    db: Session = Depends(get_db),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    _get_auditoria_validada(auditoria_id, db, sedes_permitidas)
    return (
        db.query(AuditoriaTarea)
        .filter(AuditoriaTarea.auditoria_id == auditoria_id)
        .all()
    )


@router.post(
    "/{auditoria_id}/tareas",
    response_model=AuditoriaTareaOut,
    status_code=status.HTTP_201_CREATED,
)
def create_tarea(
    auditoria_id: int,
    data: AuditoriaTareaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user")),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    _get_auditoria_validada(auditoria_id, db, sedes_permitidas)

    tarea = AuditoriaTarea(
        auditoria_id=auditoria_id, **data.model_dump()
    )
    db.add(tarea)
    db.commit()
    db.refresh(tarea)
    return tarea


@router.get(
    "/{auditoria_id}/tareas/{tarea_id}", response_model=AuditoriaTareaOut
)
def get_tarea(
    auditoria_id: int,
    tarea_id: int,
    db: Session = Depends(get_db),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    _get_auditoria_validada(auditoria_id, db, sedes_permitidas)

    tarea = (
        db.query(AuditoriaTarea)
        .filter(
            AuditoriaTarea.id == tarea_id,
            AuditoriaTarea.auditoria_id == auditoria_id,
        )
        .first()
    )
    if not tarea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada",
        )
    return tarea


@router.put(
    "/{auditoria_id}/tareas/{tarea_id}", response_model=AuditoriaTareaOut
)
def update_tarea(
    auditoria_id: int,
    tarea_id: int,
    data: AuditoriaTareaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user")),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    _get_auditoria_validada(auditoria_id, db, sedes_permitidas)

    tarea = (
        db.query(AuditoriaTarea)
        .filter(
            AuditoriaTarea.id == tarea_id,
            AuditoriaTarea.auditoria_id == auditoria_id,
        )
        .first()
    )
    if not tarea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tarea, field, value)

    db.commit()
    db.refresh(tarea)
    return tarea


@router.delete("/{auditoria_id}/tareas/{tarea_id}")
def delete_tarea(
    auditoria_id: int,
    tarea_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    _get_auditoria_validada(auditoria_id, db, sedes_permitidas)

    tarea = (
        db.query(AuditoriaTarea)
        .filter(
            AuditoriaTarea.id == tarea_id,
            AuditoriaTarea.auditoria_id == auditoria_id,
        )
        .first()
    )
    if not tarea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada",
        )

    db.delete(tarea)
    db.commit()
    return {"eliminada": True, "mensaje": "Tarea eliminada correctamente"}