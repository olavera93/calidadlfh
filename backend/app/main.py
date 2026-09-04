

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, odoo, sedes, temperaturas, usuarios
from app.routers import proveedores, productos
from app.routers import documento  # O documentos según nombraste el archivo
from app.schemas.proveedor import ProveedorResponse, ProveedorSimple
from app.schemas.producto import ProductoResponse, ProductoSimple
from app.routers import contacto
from app.routers import devolucion 
from app.routers import auditoria
from app.routers import auditoria_tarea

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema de Calidad Farmacéutica")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(usuarios.router, prefix="/api", tags=["usuarios"])
app.include_router(sedes.router, prefix="/api", tags=["sedes"])
app.include_router(temperaturas.router, prefix="/api", tags=["temperaturas"])
app.include_router(odoo.router, prefix="/api", tags=["odoo"])
app.include_router(proveedores.router)
app.include_router(productos.router)
app.include_router(documento.router, prefix="/api")
app.include_router(devolucion.router, prefix="/api")
app.include_router(auditoria.router, tags=["auditorias"])
app.include_router(auditoria_tarea.router, prefix="/api", tags=["auditorias_tareas"]) 
app.include_router(contacto.router)


ProveedorResponse.model_rebuild()
ProductoResponse.model_rebuild()