from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import Area, RegistroTemperatura
from app.schemas.temperatura import RegistroCreate, RegistroOut, RegistroUpdate


def _alerta(r: RegistroTemperatura, area: Area) -> bool:
    if area.temp_min is not None and r.temperatura < area.temp_min:
        return True
    if area.temp_max is not None and r.temperatura > area.temp_max:
        return True
    if r.humedad is not None:
        if area.humedad_min is not None and r.humedad < area.humedad_min:
            return True
        if area.humedad_max is not None and r.humedad > area.humedad_max:
            return True
    return False


def create_registro(
    db: Session, data: RegistroCreate, usuario_id: int
) -> RegistroTemperatura:
    registro = RegistroTemperatura(
        area_id=data.area_id,
        temperatura=data.temperatura,
        humedad=data.humedad,
        fecha=data.fecha,
        hora=data.hora,
        usuario_id=usuario_id,
        observaciones=data.observaciones,
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


def update_registro(
    db: Session, registro_id: int, data: RegistroUpdate
) -> Optional[RegistroTemperatura]:
    registro = db.query(RegistroTemperatura).filter(RegistroTemperatura.id == registro_id).first()
    if not registro:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(registro, field, value)
    db.commit()
    db.refresh(registro)
    return registro


def get_registros(
    db: Session,
    sede_ids: list[int],
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    area_id: Optional[int] = None,
) -> list[RegistroOut]:
    query = (
        db.query(RegistroTemperatura)
        .join(RegistroTemperatura.area)
        .filter(Area.sede_id.in_(sede_ids))
    )

    if fecha_inicio:
        query = query.filter(RegistroTemperatura.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(RegistroTemperatura.fecha <= fecha_fin)
    if area_id:
        query = query.filter(RegistroTemperatura.area_id == area_id)

    registros = query.order_by(
        RegistroTemperatura.fecha.desc(), RegistroTemperatura.hora.desc()
    ).all()

    return [
        RegistroOut(
            id=r.id,
            area_id=r.area_id,
            area_nombre=r.area.nombre,
            sede_id=r.area.sede_id,
            sede_nombre=r.area.sede.nombre,
            temperatura=r.temperatura,
            humedad=r.humedad,
            fecha=r.fecha,
            hora=r.hora,
            usuario_id=r.usuario_id,
            usuario_nombre=r.usuario.nombre,
            observaciones=r.observaciones,
            created_at=r.created_at,
            alerta=_alerta(r, r.area),
        )
        for r in registros
    ]
