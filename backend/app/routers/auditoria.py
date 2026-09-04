from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload



from app.core.dependencies import get_current_user, get_sedes_permitidas, require_admin, require_roles
from app.database import get_db
from app.models.models import Usuario
from app.models.auditoria import Auditoria
from app.schemas.auditoria import AuditoriaCreate, AuditoriaOut, AuditoriaUpdate

router = APIRouter()


@router.get("/auditorias", response_model=list[AuditoriaOut])
def list_auditorias(
    db: Session = Depends(get_db),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    todas = (
        db.query(Auditoria)
        .options(joinedload(Auditoria.sede))
        .filter(Auditoria.sede_id.in_(sedes_permitidas))
        .all()
    )
    return todas


@router.get("/auditorias/{auditoria_id}", response_model=AuditoriaOut)
def get_auditoria(
    auditoria_id: int,
    db: Session = Depends(get_db),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    auditoria = (
        db.query(Auditoria)
        .options(joinedload(Auditoria.sede))
        .filter(Auditoria.id == auditoria_id)
        .first()
    )
    if not auditoria:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auditoría no encontrada")
    if auditoria.sede_id not in sedes_permitidas:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta sede")
    return auditoria


@router.post("/auditorias", response_model=AuditoriaOut, status_code=status.HTTP_201_CREATED)
def create_auditoria(
    data: AuditoriaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user")),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    if data.sede_id not in sedes_permitidas:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta sede")

    auditoria = Auditoria(**data.model_dump())
    db.add(auditoria)
    db.commit()
    db.refresh(auditoria)
    return auditoria


@router.put("/auditorias/{auditoria_id}", response_model=AuditoriaOut)
def update_auditoria(
    auditoria_id: int,
    data: AuditoriaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user")),
):
    auditoria = db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    if not auditoria:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auditoría no encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(auditoria, field, value)

    db.commit()
    db.refresh(auditoria)
    return auditoria


@router.delete("/auditorias/{auditoria_id}")
def delete_auditoria(
    auditoria_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    auditoria = db.query(Auditoria).filter(Auditoria.id == auditoria_id).first()
    if not auditoria:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auditoría no encontrada")

    db.delete(auditoria)
    db.commit()
    return {"eliminada": True, "mensaje": "Auditoría eliminada correctamente"}