"""
Migración: añade humedad_min y humedad_max a la tabla areas.
Ejecutar desde el directorio backend/:
    python migrate_add_humidity.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine

ALTERACIONES = [
    "ALTER TABLE areas ADD COLUMN humedad_min FLOAT NULL",
    "ALTER TABLE areas ADD COLUMN humedad_max FLOAT NULL",
]

with engine.connect() as conn:
    for sql in ALTERACIONES:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"OK: {sql}")
        except Exception as e:
            print(f"Omitida (ya existe): {e}")

print("Migración completada.")
