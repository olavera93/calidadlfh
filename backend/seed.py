"""
Script de población inicial de la base de datos.
Ejecutar desde el directorio backend/:
    python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models.models import Area, Base, Sede, Usuario, UsuarioSede
from app.core.security import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # --- Sedes ---
        sede_principal = db.query(Sede).filter(Sede.nombre == "Principal").first()
        if not sede_principal:
            sede_principal = Sede(nombre="Principal", descripcion="Sede principal")
            db.add(sede_principal)
            db.flush()
            print("Sede 'Principal' creada.")
        else:
            print("Sede 'Principal' ya existe.")

        sede_teusaquillo = db.query(Sede).filter(Sede.nombre == "Teusaquillo").first()
        if not sede_teusaquillo:
            sede_teusaquillo = Sede(nombre="Teusaquillo", descripcion="Sede Teusaquillo")
            db.add(sede_teusaquillo)
            db.flush()
            print("Sede 'Teusaquillo' creada.")
        else:
            print("Sede 'Teusaquillo' ya existe.")

        # --- Áreas sede Principal ---
        areas_principal = [
            {"nombre": "Nevera 1", "tipo": "nevera", "temp_min": 2.0, "temp_max": 8.0},
            {"nombre": "Nevera 2", "tipo": "nevera", "temp_min": 2.0, "temp_max": 8.0},
            {"nombre": "Almacén", "tipo": "ambiente", "temp_min": 15.0, "temp_max": 25.0},
        ]
        for a in areas_principal:
            existe = (
                db.query(Area)
                .filter(Area.sede_id == sede_principal.id, Area.nombre == a["nombre"])
                .first()
            )
            if not existe:
                area = Area(sede_id=sede_principal.id, **a)
                db.add(area)
                print(f"  Área '{a['nombre']}' creada en Principal.")

        # --- Áreas sede Teusaquillo ---
        areas_teusaquillo = [
            {"nombre": "Nevera 1", "tipo": "nevera", "temp_min": 2.0, "temp_max": 8.0},
            {"nombre": "Nevera 2", "tipo": "nevera", "temp_min": 2.0, "temp_max": 8.0},
            {"nombre": "Almacén", "tipo": "ambiente", "temp_min": 15.0, "temp_max": 25.0},
        ]
        for a in areas_teusaquillo:
            existe = (
                db.query(Area)
                .filter(Area.sede_id == sede_teusaquillo.id, Area.nombre == a["nombre"])
                .first()
            )
            if not existe:
                area = Area(sede_id=sede_teusaquillo.id, **a)
                db.add(area)
                print(f"  Área '{a['nombre']}' creada en Teusaquillo.")

        db.flush()

        # --- Usuarios ---
        usuarios_data = [
            {
                "nombre": "Administrador",
                "username": "admin",
                "password": "admin123",
                "rol": "admin",
                "sedes": [sede_principal.id, sede_teusaquillo.id],
            },
            {
                "nombre": "Usuario Principal",
                "username": "principal",
                "password": "principal123",
                "rol": "user",
                "sedes": [sede_principal.id],
            },
            {
                "nombre": "Usuario Teusaquillo",
                "username": "teusaquillo",
                "password": "teusaquillo123",
                "rol": "user",
                "sedes": [sede_teusaquillo.id],
            },
        ]

        for ud in usuarios_data:
            existe = db.query(Usuario).filter(Usuario.username == ud["username"]).first()
            if not existe:
                usuario = Usuario(
                    nombre=ud["nombre"],
                    username=ud["username"],
                    hashed_password=hash_password(ud["password"]),
                    rol=ud["rol"],
                )
                db.add(usuario)
                db.flush()
                for sede_id in ud["sedes"]:
                    us = UsuarioSede(usuario_id=usuario.id, sede_id=sede_id)
                    db.add(us)
                print(f"Usuario '{ud['username']}' creado.")
            else:
                print(f"Usuario '{ud['username']}' ya existe.")

        db.commit()
        print("\nSeed completado exitosamente.")

    except Exception as e:
        db.rollback()
        print(f"Error durante el seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
