from sqlalchemy import Column, ForeignKey, Integer, JSON, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Auditoria(Base):
    __tablename__ = "auditorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre_auditor = Column(String(100), nullable=False)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    documento_adt = Column(String(100), nullable=True)
    estado = Column(String(50), nullable=False)
    fecha_auditoria = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sede = relationship("Sede", back_populates="auditorias")