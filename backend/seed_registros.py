"""
Genera registros de temperatura aleatorios para el mes actual.
Ejecutar desde el directorio backend/:
    python seed_registros.py
"""
import random
import sys
import os
from datetime import date, time

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.models import Area, RegistroTemperatura, Sede, Usuario, UsuarioSede

random.seed(42)

# Momentos del día: (hora, variación_térmica relativa al base del área)
MOMENTOS = [
    (time(8,  0), 0.0),   # mañana — temperatura base
    (time(14, 0), 0.6),   # tarde  — ligeramente más cálido
    (time(20, 0), 0.3),   # noche  — intermedio
]

# Probabilidad de que una lectura esté fuera de rango (para realismo)
P_FUERA_RANGO = 0.07


def temp_aleatoria(temp_min: float, temp_max: float, variacion: float) -> float:
    rango = temp_max - temp_min
    base = temp_min + rango * 0.35 + variacion * rango * 0.15
    desv = rango * 0.12
    valor = round(random.gauss(base, desv), 1)

    # Ocasionalmente sale del rango
    if random.random() < P_FUERA_RANGO:
        if random.random() < 0.5:
            valor = round(temp_min - random.uniform(0.2, 1.5), 1)
        else:
            valor = round(temp_max + random.uniform(0.2, 1.5), 1)

    return valor


def usuarios_por_sede(db, sede_id: int) -> list:
    ids = [us.usuario_id for us in db.query(UsuarioSede).filter(UsuarioSede.sede_id == sede_id)]
    return db.query(Usuario).filter(Usuario.id.in_(ids)).all()


def ya_existe(db, area_id: int, fecha: date, hora: time) -> bool:
    return db.query(RegistroTemperatura).filter(
        RegistroTemperatura.area_id == area_id,
        RegistroTemperatura.fecha == fecha,
        RegistroTemperatura.hora == hora,
    ).first() is not None


def seed():
    db = SessionLocal()
    try:
        hoy = date.today()
        mes_actual = hoy.month
        anio_actual = hoy.year

        dias = [date(anio_actual, mes_actual, d) for d in range(1, hoy.day + 1)]

        sedes = db.query(Sede).filter(Sede.activa == True).all()
        total = 0

        for sede in sedes:
            areas = db.query(Area).filter(Area.sede_id == sede.id, Area.activa == True).all()
            usuarios = usuarios_por_sede(db, sede.id)

            if not usuarios:
                print(f"[!] Sede '{sede.nombre}' sin usuarios, saltando.")
                continue

            print(f"\nSede: {sede.nombre}")

            for area in areas:
                omitidos = 0
                for dia in dias:
                    for hora, variacion in MOMENTOS:
                        if ya_existe(db, area.id, dia, hora):
                            omitidos += 1
                            continue

                        temperatura = temp_aleatoria(area.temp_min, area.temp_max, variacion)
                        usuario = random.choice(usuarios)

                        registro = RegistroTemperatura(
                            area_id=area.id,
                            temperatura=temperatura,
                            fecha=dia,
                            hora=hora,
                            usuario_id=usuario.id,
                        )
                        db.add(registro)
                        total += 1

                print(f"  {area.nombre}: {len(dias) * len(MOMENTOS) - omitidos} registros nuevos"
                      + (f" ({omitidos} ya existían)" if omitidos else ""))

        db.commit()
        print(f"\n✔ {total} registros insertados para {mes_actual}/{anio_actual}.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
