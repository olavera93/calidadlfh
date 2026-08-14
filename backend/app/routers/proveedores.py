from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session,joinedload
from typing import List

from app.database import get_db
from app.models.proveedor import Proveedor
from app.schemas.proveedor import ProveedorCreate, ProveedorUpdate, ProveedorResponse

router = APIRouter(
    prefix="/api/proveedores",
    tags=["Proveedores"]
)

@router.get("/", response_model=List[ProveedorResponse])
def get_proveedores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Proveedor).offset(skip).limit(limit).all()

@router.get("/{proveedor_id}", response_model=ProveedorResponse)
def get_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    # 👈 Se añade joinedload para traer los productos asociados
    db_proveedor = db.query(Proveedor).options(joinedload(Proveedor.productos)).filter(Proveedor.id == proveedor_id).first()
    
    if not db_proveedor:
        raise HTTPException(
            status_code=404, 
            detail="Proveedor no encontrado"
        )
        
    return db_proveedor

@router.post("/", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED)
def create_proveedor(proveedor: ProveedorCreate, db: Session = Depends(get_db)):
    db_exists = db.query(Proveedor).filter(Proveedor.identificacion == proveedor.identificacion).first()
    if db_exists:
        raise HTTPException(status_code=400, detail="Ya existe un proveedor con esta identificación")
    
    nuevo_proveedor = Proveedor(**proveedor.model_dump())
    db.add(nuevo_proveedor)
    db.commit()
    db.refresh(nuevo_proveedor)
    return nuevo_proveedor

@router.post("/importar-json", status_code=status.HTTP_200_OK)
def importar_proveedores_json(proveedores: List[ProveedorCreate], db: Session = Depends(get_db)):
    if not proveedores:
        raise HTTPException(status_code=400, detail="La lista de proveedores está vacía")

    try:
        # 1. Extraemos todas las identificaciones enviadas desde el frontend
        identificaciones = [p.identificacion for p in proveedores]

        # 2. Consultamos de una sola vez los proveedores que ya existen en BD
        existentes = db.query(Proveedor).filter(Proveedor.identificacion.in_(identificaciones)).all()
        existentes_dict = {p.identificacion: p for p in existentes}

        nuevos_registros = []
        actualizados_count = 0

        # 3. Clasificamos entre actualizar existentes o insertar nuevos
        for prov_data in proveedores:
            data_dict = prov_data.model_dump()
            identificacion = data_dict['identificacion']

            if identificacion in existentes_dict:
                # Actualiza el registro existente
                db_prov = existentes_dict[identificacion]
                for key, value in data_dict.items():
                    setattr(db_prov, key, value)
                actualizados_count += 1
            else:
                # Agrega a la lista para inserción masiva
                nuevos_registros.append(Proveedor(**data_dict))

        # 4. Insertamos los nuevos registros si los hay
        if nuevos_registros:
            db.bulk_save_objects(nuevos_registros)

        # 5. Confirmamos la transacción
        db.commit()

        return {
            "message": "Importación completada con éxito",
            "creados": len(nuevos_registros),
            "actualizados": actualizados_count,
            "total_procesados": len(proveedores)
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error durante la importación masiva: {str(e)}"
        )

@router.put("/{proveedor_id}", response_model=ProveedorResponse)
def update_proveedor(proveedor_id: int, proveedor_data: ProveedorUpdate, db: Session = Depends(get_db)):
    db_proveedor = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()
    if not db_proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    update_dict = proveedor_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_proveedor, key, value)

    db.commit()
    db.refresh(db_proveedor)
    return db_proveedor

@router.delete("/{proveedor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    db_proveedor = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()
    if not db_proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    db.delete(db_proveedor)
    db.commit()
    return None