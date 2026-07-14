from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.crud import usuario as crud_usuario
from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter()


@router.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    usuario = crud_usuario.get_by_username(db, data.username)
    if not usuario or not verify_password(data.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
        )

    token = create_access_token({"sub": str(usuario.id)})
    sedes = crud_usuario.get_sedes_ids(db, usuario.id)

    return TokenResponse(
        access_token=token,
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        rol=usuario.rol,
        sedes=sedes,
    )
