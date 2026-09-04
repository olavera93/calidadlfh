from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class AuditoriaTarea(Base):
    __tablename__ = "auditoria_tareas"

    id = Column(Integer, primary_key=True, index=True)
    auditoria_id = Column(Integer, ForeignKey("auditorias.id"), nullable=False)

    nombre_tarea = Column(String(200), nullable=False)
    estado = Column(
        String(50), nullable=False, default="PENDIENTE"
    )  # ej: PENDIENTE, EN_PROCESO, COMPLETADA

    fecha_inicio = Column(DateTime, nullable=True)
    fecha_ejecutada = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)

    comentario = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relación hacia el modelo Auditoria
    auditoria = relationship("Auditoria", back_populates="tareas")