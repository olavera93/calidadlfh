from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.contacto import Contacto
from app.models.proveedor import Proveedor
from app.schemas.contacto import ContactoCreate, ContactoUpdate, ContactoResponse

router = APIRouter(
    prefix="/api/contactos",
    tags=["Contactos"]
)

@router.get("/", response_model=List[ContactoResponse])
def get_contactos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Contacto).offset(skip).limit(limit).all()

@router.get("/proveedor/{proveedor_id}", response_model=List[ContactoResponse])
def get_contactos_por_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    return db.query(Contacto).filter(Contacto.proveedor_id == proveedor_id).all()

@router.get("/{contacto_id}", response_model=ContactoResponse)
def get_contacto(contacto_id: int, db: Session = Depends(get_db)):
    db_contacto = db.query(Contacto).options(joinedload(Contacto.proveedor)).filter(Contacto.id == contacto_id).first()
    if not db_contacto:
        raise HTTPException(
            status_code=404,
            detail="Contacto no encontrado"
        )
    return db_contacto

@router.post("/", response_model=ContactoResponse, status_code=status.HTTP_201_CREATED)
def create_contacto(contacto: ContactoCreate, db: Session = Depends(get_db)):
    # Validar que el proveedor exista
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
def update_contacto(contacto_id: int, contacto_data: ContactoUpdate, db: Session = Depends(get_db)):
    db_contacto = db.query(Contacto).filter(Contacto.id == contacto_id).first()
    if not db_contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    update_dict = contacto_data.model_dump(exclude_unset=True)

    # Validar proveedor si se está actualizando proveedor_id
    if "proveedor_id" in update_dict:
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
    db_contacto = db.query(Contacto).filter(Contacto.id == contacto_id).first()
    if not db_contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    db.delete(db_contacto)
    db.commit()
    return None