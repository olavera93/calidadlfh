from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Sede(Base):
    __tablename__ = "sedes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(String(255), nullable=True)
    activa = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    areas = relationship("Area", back_populates="sede")
    usuarios_sedes = relationship("UsuarioSede", back_populates="sede")
    auditorias = relationship("Auditoria", back_populates="sede")


class Area(Base):
    __tablename__ = "areas"

    id = Column(Integer, primary_key=True, index=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    nombre = Column(String(100), nullable=False)
    tipo = Column(String(50), nullable=True)
    temp_min = Column(Float, nullable=True)
    temp_max = Column(Float, nullable=True)
    humedad_min = Column(Float, nullable=True)
    humedad_max = Column(Float, nullable=True)
    activa = Column(Boolean, default=True)

    sede = relationship("Sede", back_populates="areas")
    registros = relationship("RegistroTemperatura", back_populates="area")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(String(20), default="user")
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    usuarios_sedes = relationship("UsuarioSede", back_populates="usuario")
    registros = relationship("RegistroTemperatura", back_populates="usuario")


class UsuarioSede(Base):
    __tablename__ = "usuario_sedes"

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), primary_key=True)

    usuario = relationship("Usuario", back_populates="usuarios_sedes")
    sede = relationship("Sede", back_populates="usuarios_sedes")


class RegistroTemperatura(Base):
    __tablename__ = "registros_temperatura"

    id = Column(Integer, primary_key=True, index=True)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    temperatura = Column(Float, nullable=False)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    humedad = Column(Float, nullable=True)
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    area = relationship("Area", back_populates="registros")
    usuario = relationship("Usuario", back_populates="registros")


class OdooSetting(Base):
    __tablename__ = "odoo_settings"

    id         = Column(Integer, primary_key=True, index=True)
    url        = Column(String(255), nullable=False)
    database   = Column(String(100), nullable=False)
    username   = Column(String(100), nullable=False)
    uid        = Column(Integer, nullable=False, default=0)
    password   = Column(Text, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
