from sqlalchemy.orm import Session

from app.models.models import Area, Sede
from app.schemas.sede import SedeCreate, SedeUpdate
from app.schemas.temperatura import AreaCreate, AreaUpdate


def get_all(db: Session) -> list[Sede]:
    return db.query(Sede).all()


def get_by_id(db: Session, sede_id: int) -> Sede | None:
    return db.query(Sede).filter(Sede.id == sede_id).first()


def create(db: Session, data: SedeCreate) -> Sede:
    sede = Sede(nombre=data.nombre, descripcion=data.descripcion)
    db.add(sede)
    db.commit()
    db.refresh(sede)
    return sede


def update(db: Session, sede_id: int, data: SedeUpdate) -> Sede | None:
    sede = get_by_id(db, sede_id)
    if not sede:
        return None
    if data.nombre is not None:
        sede.nombre = data.nombre
    if data.descripcion is not None:
        sede.descripcion = data.descripcion
    if data.activa is not None:
        sede.activa = data.activa
    db.commit()
    db.refresh(sede)
    return sede


def delete(db: Session, sede_id: int) -> bool:
    sede = get_by_id(db, sede_id)
    if not sede:
        return False
    db.delete(sede)
    db.commit()
    return True


def get_areas_by_sede(db: Session, sede_id: int, include_inactive: bool = False) -> list[Area]:
    q = db.query(Area).filter(Area.sede_id == sede_id)
    if not include_inactive:
        q = q.filter(Area.activa == True)
    return q.order_by(Area.id).all()


def create_area(db: Session, sede_id: int, data: AreaCreate) -> Area:
    area = Area(
        sede_id=sede_id,
        nombre=data.nombre,
        tipo=data.tipo,
        temp_min=data.temp_min,
        temp_max=data.temp_max,
        humedad_min=data.humedad_min,
        humedad_max=data.humedad_max,
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


def update_area(db: Session, area_id: int, data: AreaUpdate) -> Area | None:
    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        return None
    for field in ("nombre", "tipo", "temp_min", "temp_max", "humedad_min", "humedad_max", "activa"):
        val = getattr(data, field)
        if val is not None:
            setattr(area, field, val)
    db.commit()
    db.refresh(area)
    return area


def delete_area(db: Session, area_id: int) -> tuple[bool, int]:
    """Retorna (eliminada, cantidad_registros). Si tiene registros, solo desactiva."""
    from app.models.models import RegistroTemperatura
    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        return False, 0
    n_registros = db.query(RegistroTemperatura).filter(RegistroTemperatura.area_id == area_id).count()
    if n_registros > 0:
        area.activa = False
        db.commit()
        return False, n_registros
    db.delete(area)
    db.commit()
    return True, 0
