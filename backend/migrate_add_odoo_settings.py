"""
Migración: crea la tabla odoo_settings para almacenar credenciales de Odoo.
Ejecutar desde el directorio backend/:
    python migrate_add_odoo_settings.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine

CREATE = """
CREATE TABLE IF NOT EXISTS odoo_settings (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    url         VARCHAR(255) NOT NULL,
    database    VARCHAR(100) NOT NULL,
    username    VARCHAR(100) NOT NULL,
    uid         INT NOT NULL DEFAULT 0,
    password    TEXT NOT NULL,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
"""

with engine.connect() as conn:
    try:
        conn.execute(text(CREATE))
        conn.commit()
        print("OK: tabla odoo_settings creada.")
    except Exception as e:
        print(f"Error: {e}")

print("Migración completada.")
