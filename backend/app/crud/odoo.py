from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import OdooSetting
from app.schemas.odoo import OdooSettingsCreate, OdooSettingsUpdate


def get_settings(db: Session) -> Optional[OdooSetting]:
    return db.query(OdooSetting).first()


def upsert_settings(db: Session, data: OdooSettingsCreate) -> OdooSetting:
    setting = db.query(OdooSetting).first()
    if setting:
        setting.url      = data.url
        setting.database = data.database
        setting.username = data.username
        if data.password:
            setting.password = data.password
        setting.uid = 0
    else:
        if not data.password:
            raise ValueError("La contraseña es obligatoria al crear la configuración.")
        setting = OdooSetting(
            url=data.url,
            database=data.database,
            username=data.username,
            password=data.password,
            uid=0,
        )
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def update_uid(db: Session, setting: OdooSetting, uid: int) -> OdooSetting:
    setting.uid = uid
    db.commit()
    db.refresh(setting)
    return setting
