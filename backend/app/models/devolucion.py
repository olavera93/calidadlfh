from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base  # Importado desde app.database como en tus otros modelos

class Devolucion(Base):
    __tablename__ = "devoluciones"

    id = Column(Integer, primary_key=True, index=True)
    
    # Apuntan a "producto.id" y "proveedor.id" en SINGULAR
    producto_id = Column(Integer, ForeignKey("producto.id"), nullable=False)
    proveedor_id = Column(Integer, ForeignKey("proveedor.id"), nullable=False)
    
    forma_farmaceutica = Column(String(100), nullable=True)
    lote = Column(String(50), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_de_vencimiento = Column(Date, nullable=True)
    registrosanitario = Column(String(100), nullable=True)
    cantidad = Column(Integer, nullable=False)
    causa = Column(Text, nullable=True)
    observaciones = Column(Text, nullable=True)
    quien_recibe = Column(String(150), nullable=True)
    quien_entrega = Column(String(150), nullable=True)
    numero_de_formato = Column(String(50), nullable=True)
    estado = Column(String(50), default="Pendiente")

    producto = relationship("Producto", back_populates="devoluciones")
    proveedor = relationship("Proveedor", back_populates="devoluciones")