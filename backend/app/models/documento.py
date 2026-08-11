from sqlalchemy import Column, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship
from app.database import Base


class Documento(Base):
    __tablename__ = "documento"

    id = Column(Integer, primary_key=True, index=True)
    nombre_docu = Column(String(255), nullable=False)

    # Llaves foráneas
    producto_id = Column(Integer, ForeignKey("producto.id"), nullable=True)
    proveedor_id = Column(Integer, ForeignKey("proveedor.id"), nullable=True)

    # Etiquetas guardadas como JSON
    etiquetas = Column(JSON, nullable=True)

    # Relaciones
    producto = relationship("Producto", backref="documentos")
    proveedor = relationship("Proveedor", backref="documentos")