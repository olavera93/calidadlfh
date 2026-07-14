from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_sedes_permitidas, require_admin
from app.crud import temperatura as crud_temp
from app.database import get_db
from app.models.models import Area, RegistroTemperatura, Usuario
from app.schemas.temperatura import RegistroCreate, RegistroOut, RegistroUpdate

router = APIRouter()


@router.get("/temperaturas", response_model=list[RegistroOut])
def list_temperaturas(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    area_id: Optional[int] = None,
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    # Si se filtra por sede, validar que pertenezca a las sedes permitidas
    if sede_id is not None:
        if sede_id not in sedes_permitidas:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a esta sede",
            )
        filtro_sedes = [sede_id]
    else:
        filtro_sedes = sedes_permitidas

    return crud_temp.get_registros(db, filtro_sedes, fecha_inicio, fecha_fin, area_id)


@router.post("/temperaturas", response_model=RegistroOut, status_code=status.HTTP_201_CREATED)
def create_temperatura(
    data: RegistroCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    sedes_permitidas: list[int] = Depends(get_sedes_permitidas),
):
    area = db.query(Area).filter(Area.id == data.area_id).first()
    if not area:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Área no encontrada")
    if area.sede_id not in sedes_permitidas:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso al área indicada",
        )

    registro = crud_temp.create_registro(db, data, current_user.id)

    return RegistroOut(
        id=registro.id,
        area_id=registro.area_id,
        area_nombre=area.nombre,
        sede_id=area.sede_id,
        sede_nombre=area.sede.nombre,
        temperatura=registro.temperatura,
        humedad=registro.humedad,
        fecha=registro.fecha,
        hora=registro.hora,
        usuario_id=registro.usuario_id,
        usuario_nombre=current_user.nombre,
        observaciones=registro.observaciones,
        created_at=registro.created_at,
        alerta=crud_temp._alerta(registro, area),
    )


@router.patch("/temperaturas/{registro_id}", response_model=RegistroOut)
def update_temperatura(
    registro_id: int,
    data: RegistroUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    registro = crud_temp.update_registro(db, registro_id, data)
    if not registro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado")
    area = registro.area
    return RegistroOut(
        id=registro.id,
        area_id=registro.area_id,
        area_nombre=area.nombre,
        sede_id=area.sede_id,
        sede_nombre=area.sede.nombre,
        temperatura=registro.temperatura,
        humedad=registro.humedad,
        fecha=registro.fecha,
        hora=registro.hora,
        usuario_id=registro.usuario_id,
        usuario_nombre=registro.usuario.nombre,
        observaciones=registro.observaciones,
        created_at=registro.created_at,
        alerta=crud_temp._alerta(registro, area),
    )


@router.delete("/temperaturas/{registro_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_temperatura(
    registro_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    registro = db.query(RegistroTemperatura).filter(RegistroTemperatura.id == registro_id).first()
    if not registro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado"
        )
    db.delete(registro)
    db.commit()
