from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date
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
    fecha_cumpleanios = Column(Date, nullable=True)

    # 1. nullable=True permite el valor NULO
    # 2. ondelete="SET NULL" le indica a la base de datos que limpie la FK al borrar el proveedor
    proveedor_id = Column(
        Integer, 
        ForeignKey("proveedor.id", ondelete="SET NULL"), 
        nullable=True
    )

    # Relación inversa
    proveedor = relationship("Proveedor", back_populates="contactos")