from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, odoo, sedes, temperaturas, usuarios
from app.routers import proveedores, productos
from app.routers import documento  # O documentos según nombraste el archivo

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