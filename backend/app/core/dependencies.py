from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.models import Sede, Usuario, UsuarioSede

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    usuario = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if usuario is None:
        raise credentials_exception
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
        )
    return usuario


def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="error de permisos: se requiere rol de administrador o verifica con el encargado",
        )
    return current_user


def require_roles(*roles: str):
    """Factory de dependencia: permite el acceso solo a los roles indicados.

    Uso: Depends(require_roles("admin", "visitador"))
    """
    def _dependency(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción",
            )
        return current_user
    return _dependency


def get_sedes_permitidas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[int]:
    if current_user.rol == "admin":
        sedes = db.query(Sede).filter(Sede.activa == True).all()
        return [s.id for s in sedes]
    else:
        usuario_sedes = (
            db.query(UsuarioSede)
            .filter(UsuarioSede.usuario_id == current_user.id)
            .all()
        )
        return [us.sede_id for us in usuario_sedes]