from app.core.dependencies import require_roles 
from app.models.models import Usuario
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
import re

from app.database import get_db
from app.models.contacto import Contacto
from app.models.proveedor import Proveedor
from app.schemas.contacto import ContactoCreate, ContactoUpdate, ContactoResponse

router = APIRouter(
    prefix="/api/contactos",
    tags=["Contactos"]
)


def normalizar_identificacion(valor: str) -> str:
    """Deja solo dígitos/letras en mayúscula para poder comparar NITs con o sin
    puntos, guiones o dígito de verificación (mismo criterio usado en productos)."""
    if not valor:
        return ""
    return re.sub(r"[^A-Za-z0-9]", "", valor).upper()


def normalizar_texto(valor: str) -> str:
    """Normaliza nombres para comparaciones case-insensitive al importar."""
    if not valor:
        return ""
    return re.sub(r"\s+", " ", valor).strip().upper()



# LISTADO CON BÚSQUEDA + FILTRO POR PROVEEDOR + PAGINACIÓN

@router.get("/")
def get_contactos(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    proveedor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Contacto).options(joinedload(Contacto.proveedor))

    if proveedor_id:
        query = query.filter(Contacto.proveedor_id == proveedor_id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Contacto.nombre.ilike(like),
                Contacto.correo.ilike(like),
                Contacto.telefono.ilike(like),
                Contacto.cargo.ilike(like),
                Contacto.fecha_cumpleanios.ilike(like)
            )
        )

    total = query.count()
    items = query.order_by(Contacto.nombre.asc()).offset(skip).limit(limit).all()

    return {"items": items, "total": total}


@router.get("/proveedor/{proveedor_id}", response_model=List[ContactoResponse])
def get_contactos_por_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    return db.query(Contacto).filter(Contacto.proveedor_id == proveedor_id).all()


@router.get("/{contacto_id}", response_model=ContactoResponse)
def get_contacto(contacto_id: int, db: Session = Depends(get_db)):
    db_contacto = db.query(Contacto).options(joinedload(Contacto.proveedor)).filter(Contacto.id == contacto_id).first()
    if not db_contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return db_contacto


@router.post("/", response_model=ContactoResponse, status_code=status.HTTP_201_CREATED)
def create_contacto(
    contacto: ContactoCreate, 
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "visitador"))
):
    # Validar existencia solo si se envía un proveedor_id
    if contacto.proveedor_id is not None:
        proveedor_exists = db.query(Proveedor).filter(Proveedor.id == contacto.proveedor_id).first()
        if not proveedor_exists:
            raise HTTPException(
                status_code=400,
                detail=f"No existe un proveedor con el ID {contacto.proveedor_id}"
            )

    nuevo_contacto = Contacto(**contacto.model_dump())
    db.add(nuevo_contacto)
    db.commit()
    db.refresh(nuevo_contacto)
    return nuevo_contacto


@router.put("/{contacto_id}", response_model=ContactoResponse)
def update_contacto(
    contacto_id: int, 
    contacto_data: ContactoUpdate, 
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("admin", "visitador"))
):
    db_contacto = db.query(Contacto).filter(Contacto.id == contacto_id).first()
    if not db_contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    update_dict = contacto_data.model_dump(exclude_unset=True)

    # Validar solo si proveedor_id está en la petición y NO es None
    if update_dict.get("proveedor_id") is not None:
        proveedor_exists = db.query(Proveedor).filter(Proveedor.id == update_dict["proveedor_id"]).first()
        if not proveedor_exists:
            raise HTTPException(status_code=400, detail="El proveedor especificado no existe")

    for key, value in update_dict.items():
        setattr(db_contacto, key, value)

    db.commit()
    db.refresh(db_contacto)
    return db_contacto

@router.delete("/{contacto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contacto(contacto_id: int, db: Session = Depends(get_db)):
    _: Usuario = Depends(require_roles("admin", "visitador")),
    db_contacto = db.query(Contacto).filter(Contacto.id == contacto_id).first()
    if not db_contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    db.delete(db_contacto)
    db.commit()
    return None


# ────────────────────────────────────────────────────────────────
# IMPORTACIÓN MASIVA DESDE EXCEL/CSV
# ────────────────────────────────────────────────────────────────
@router.post("/importar-json")
def importar_contactos(contactos: List[dict], db: Session = Depends(get_db)):
    _: Usuario = Depends(require_roles("admin", "visitador")),
    """
    Cada item esperado con las llaves:
    nombre, telefono, correo, cargo, observaciones,
    proveedor_identificacion (NIT), proveedor_nombre, proveedor_id (opcional)

    Un contacto se considera "el mismo" (y por lo tanto se actualiza en vez de
    crearse) cuando coincide nombre + proveedor, comparando de forma
    normalizada (sin importar mayúsculas/espacios extra), igual que se hace
    con el código en productos.
    """
    creados = 0
    actualizados = 0
    errores = []

    # Mapa de NIT normalizado -> proveedor, para resolver proveedor_id
    # cuando el Excel solo trae el NIT / nombre del proveedor.
    proveedores = db.query(Proveedor).all()
    mapa_por_nit = {normalizar_identificacion(p.identificacion): p for p in proveedores if p.identificacion}
    mapa_por_nombre = {normalizar_texto(p.nombre): p for p in proveedores if p.nombre}

    # Contactos existentes, indexados por (proveedor_id, nombre normalizado)
    existentes = db.query(Contacto).all()
    mapa_existentes = {
        (c.proveedor_id, normalizar_texto(c.nombre)): c for c in existentes
    }

    for idx, item in enumerate(contactos, start=1):
        nombre = str(item.get("nombre") or "").strip()
        if not nombre:
            errores.append(f"Fila {idx}: falta el nombre del contacto")
            continue

        proveedor_id = item.get("proveedor_id")
        proveedor = None

        if proveedor_id:
            proveedor = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()

        if not proveedor:
            nit = normalizar_identificacion(str(item.get("proveedor_identificacion") or ""))
            if nit:
                proveedor = mapa_por_nit.get(nit)

        if not proveedor:
            nombre_prov = normalizar_texto(str(item.get("proveedor_nombre") or ""))
            if nombre_prov:
                proveedor = mapa_por_nombre.get(nombre_prov)

        if not proveedor:
            errores.append(f"Fila {idx} ({nombre}): no se encontró el proveedor")
            continue

        datos = {
            "nombre": nombre,
            "telefono": str(item.get("telefono") or "").strip() or None,
            "correo": str(item.get("correo") or "").strip() or None,
            "cargo": str(item.get("cargo") or "").strip() or None,
            "observaciones": str(item.get("observaciones") or "").strip() or None,
            "proveedor_id": proveedor.id,
            "fecha_cumpleanios": str(item.get("fecha_cumpleanios") or "").strip() or None
        }

        clave = (proveedor.id, normalizar_texto(nombre))
        existente = mapa_existentes.get(clave)

        if existente:
            for key, value in datos.items():
                setattr(existente, key, value)
            actualizados += 1
        else:
            nuevo = Contacto(**datos)
            db.add(nuevo)
            mapa_existentes[clave] = nuevo
            creados += 1

    db.commit()

    return {"creados": creados, "actualizados": actualizados, "errores": errores}