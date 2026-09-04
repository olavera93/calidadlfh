from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Auditoria(Base):
    __tablename__ = "auditorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre_auditoria = Column(String(150), nullable=False)
    nombre_auditor = Column(String(100), nullable=False)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    documento_adt = Column(String(255), nullable=True)
    estado = Column(String(50), nullable=False)

    # Manejo de fechas de la auditoría
    fecha_programada = Column(DateTime, nullable=False)
    fecha_ejecucion = Column(DateTime, nullable=True)
    fecha_finalizada = Column(DateTime, nullable=True)  # Campo modificado
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    novedades = Column(Text, nullable=True)

    # Relaciones
    sede = relationship("Sede", back_populates="auditorias")
    tareas = relationship(
        "AuditoriaTarea", back_populates="auditoria", cascade="all, delete-orphan"
    )