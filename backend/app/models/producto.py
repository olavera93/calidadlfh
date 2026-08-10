from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Producto(Base):
    __tablename__ = "producto"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(150), nullable=False)
    laboratorio = Column(String(100), nullable=True)
    
    # Clave foránea que conecta con la tabla proveedor
    proveedor_id = Column(Integer, ForeignKey("proveedor.id"), nullable=False)

    # Relación inversa con el modelo Proveedor
    proveedor = relationship("Proveedor", back_populates="productos")