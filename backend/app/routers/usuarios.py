from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.crud import usuario as crud_usuario
from app.database import get_db
from app.models.models import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate

router = APIRouter()


def _to_out(usuario: Usuario, db: Session) -> UsuarioOut:
    sedes = crud_usuario.get_sedes_ids(db, usuario.id)
    return UsuarioOut(
        id=usuario.id,
        nombre=usuario.nombre,
        username=usuario.username,
        rol=usuario.rol,
        activo=usuario.activo,
        sedes=sedes,
    )


@router.get("/usuarios", response_model=list[UsuarioOut])
def list_usuarios(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    usuarios = crud_usuario.get_all(db)
    return [_to_out(u, db) for u in usuarios]


@router.post("/usuarios", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def create_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    existing = crud_usuario.get_by_username(db, data.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya existe",
        )
    usuario = crud_usuario.create(db, data)
    return _to_out(usuario, db)


@router.get("/usuarios/{usuario_id}", response_model=UsuarioOut)
def get_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    usuario = crud_usuario.get_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return _to_out(usuario, db)


@router.put("/usuarios/{usuario_id}", response_model=UsuarioOut)
def update_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    usuario = crud_usuario.update(db, usuario_id, data)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return _to_out(usuario, db)


@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    if usuario_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propio usuario",
        )
    deleted = crud_usuario.delete(db, usuario_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
