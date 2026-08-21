from sqlite3 import Date

from sqlalchemy import Column, Integer, String, Text, ForeignKey,Date
from sqlalchemy.orm import relationship
from app.database import Base

class Contacto(Base):
    __tablename__ = "contacto"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    telefono = Column(String(20), nullable=True)
    correo = Column(String(100), nullable=True)
    cargo = Column(String(100), nullable=True)
    observaciones = Column(Text, nullable=True)

    # Nombre actualizado
    fecha_cumpleanios = Column(Date, nullable=True)

    # Clave foránea
    proveedor_id = Column(Integer, ForeignKey("proveedor.id"), nullable=False)

    # Relación inversa
    proveedor = relationship("Proveedor", back_populates="contactos")