from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_sedes_permitidas, require_admin, require_roles
from app.crud import sede as crud_sede
from app.database import get_db
from app.models.models import Usuario
from app.schemas.sede import SedeCreate, SedeOut, SedeUpdate
from app.schemas.temperatura import AreaCreate, AreaOut, AreaUpdate

router = APIRouter()


@router.get("/sedes", response_model=list[SedeOut])
def list_sedes(
    db: Session = Depends(get_db),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    todas = crud_sede.get_all(db)
    return [s for s in todas if s.id in sedes_permitidas]


@router.post("/sedes", response_model=SedeOut, status_code=status.HTTP_201_CREATED)
def create_sede(
    data: SedeCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    return crud_sede.create(db, data)


@router.put("/sedes/{sede_id}", response_model=SedeOut)
def update_sede(
    sede_id: int,
    data: SedeUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    sede = crud_sede.update(db, sede_id, data)
    if not sede:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
    return sede


@router.get("/sedes/{sede_id}/areas", response_model=list[AreaOut])
def list_areas(
    sede_id: int,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    if sede_id not in sedes_permitidas:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta sede",
        )
    if include_inactive and current_user.rol not in ("admin", "user"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    return crud_sede.get_areas_by_sede(db, sede_id, include_inactive=include_inactive)


@router.post(
    "/sedes/{sede_id}/areas",
    response_model=AreaOut,
    status_code=status.HTTP_201_CREATED,
)
def create_area(
    sede_id: int,
    data: AreaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user")),
):
    sede = crud_sede.get_by_id(db, sede_id)
    if not sede:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
    return crud_sede.create_area(db, sede_id, data)


@router.put("/areas/{area_id}", response_model=AreaOut)
def update_area(
    area_id: int,
    data: AreaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "user")),
):
    area = crud_sede.update_area(db, area_id, data)
    if not area:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Área no encontrada")
    return area


@router.delete("/areas/{area_id}")
def delete_area(
    area_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    deleted, n_registros = crud_sede.delete_area(db, area_id)
    if deleted:
        return {"eliminada": True, "mensaje": "Área eliminada correctamente"}
    if n_registros > 0:
        return {
            "eliminada": False,
            "mensaje": f"El área tiene {n_registros} registros de temperatura. Fue desactivada en lugar de eliminada.",
        }
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Área no encontrada")