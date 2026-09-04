from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Proveedor(Base):
    __tablename__ = "proveedor"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    identificacion = Column(String(50), unique=True, nullable=False, index=True)
    telefono = Column(String(20), nullable=True)
    direccion = Column(String(255), nullable=True)
    correo = Column(String(100), nullable=True)
    
    # Nuevos campos solicitados
    terminos = Column(Text, nullable=True) # Text para textos largos de términos y condiciones
    banco = Column(String(100), nullable=True)
    cuenta = Column(String(50), nullable=True)
    
    # Campo para borrado lógico / estado
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    productos = relationship("Producto", back_populates="proveedor")
    contactos = relationship("Contacto", back_populates="proveedor")
    devoluciones = relationship("Devolucion", back_populates="proveedor")