from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.models import Usuario, UsuarioSede
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate


def get_by_username(db: Session, username: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.username == username).first()


def get_by_id(db: Session, usuario_id: int) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def get_all(db: Session) -> list[Usuario]:
    return db.query(Usuario).all()


def create(db: Session, data: UsuarioCreate) -> Usuario:
    usuario = Usuario(
        nombre=data.nombre,
        username=data.username,
        hashed_password=hash_password(data.password),
        rol=data.rol,
    )
    db.add(usuario)
    db.flush()
    assign_sedes(db, usuario.id, data.sedes)
    db.commit()
    db.refresh(usuario)
    return usuario


def update(db: Session, usuario_id: int, data: UsuarioUpdate) -> Usuario | None:
    usuario = get_by_id(db, usuario_id)
    if not usuario:
        return None

    if data.nombre is not None:
        usuario.nombre = data.nombre
    if data.password is not None:
        usuario.hashed_password = hash_password(data.password)
    if data.rol is not None:
        usuario.rol = data.rol
    if data.activo is not None:
        usuario.activo = data.activo
    if data.sedes is not None:
        assign_sedes(db, usuario_id, data.sedes)

    db.commit()
    db.refresh(usuario)
    return usuario


def delete(db: Session, usuario_id: int) -> bool:
    usuario = get_by_id(db, usuario_id)
    if not usuario:
        return False
    db.query(UsuarioSede).filter(UsuarioSede.usuario_id == usuario_id).delete()
    db.delete(usuario)
    db.commit()
    return True


def assign_sedes(db: Session, usuario_id: int, sede_ids: list[int]) -> None:
    db.query(UsuarioSede).filter(UsuarioSede.usuario_id == usuario_id).delete()
    for sede_id in sede_ids:
        us = UsuarioSede(usuario_id=usuario_id, sede_id=sede_id)
        db.add(us)
    db.flush()


def get_sedes_ids(db: Session, usuario_id: int) -> list[int]:
    rows = db.query(UsuarioSede).filter(UsuarioSede.usuario_id == usuario_id).all()
    return [r.sede_id for r in rows]
