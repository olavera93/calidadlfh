# Guía de Despliegue con Docker

Esta carpeta contiene todo lo necesario para empaquetar y ejecutar el **Sistema de Calidad** utilizando Docker y Docker Compose en tu máquina virtual (servidor).

## Requisitos en la Máquina Virtual (Servidor)

Asegúrate de tener instalados **Docker** y **Docker Compose** en el servidor. Si utilizas Ubuntu/Debian, puedes instalarlos con:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
*(Nota: Cierra sesión y vuelve a entrar para que se aplique el permiso de `docker` sin usar `sudo`).*

---

## Cómo desplegar el proyecto

1. **Subir los archivos del proyecto al servidor**:
   Puedes clonar el repositorio en la máquina virtual o transferir la carpeta del proyecto.

2. **Configurar las variables de entorno (Opcional)**:
   Puedes modificar las contraseñas y claves secretas en el archivo `docker-compose.yml` en la sección de variables de entorno de cada servicio.

3. **Iniciar los contenedores**:
   En la raíz del proyecto (donde está el archivo `docker-compose.yml`), ejecuta:
   ```bash
   docker compose up --build -d
   ```
   *Este comando compilará las imágenes de frontend/backend, descargará la base de datos MariaDB e iniciará todos los servicios en segundo plano (`-d`).*

4. **Verificar el estado**:
   Puedes ver si los contenedores están corriendo con:
   ```bash
   docker compose ps
   ```

5. **Ver logs**:
   Para ver los registros en tiempo real (por ejemplo, para solucionar fallos):
   ```bash
   docker compose logs -f
   ```

---

## Puertos y Servicios Disponibles

Una vez iniciado con éxito:
* **Frontend (Aplicación Web)**: Accesible en el puerto `80` (puerto HTTP estándar) de la IP de tu servidor (ej. `http://IP_DE_TU_SERVIDOR`).
* **Backend (FastAPI)**: Accesible en el puerto `8000`.
* **Documentación interactiva de la API**: Disponible en `http://IP_DE_TU_SERVIDOR:8000/docs` o a través del proxy en `http://IP_DE_TU_SERVIDOR/api/docs`.
* **Base de datos (MariaDB)**: Corre internamente y expone el puerto `3306` (mapeado para accesos externos si es necesario). Los datos son persistentes gracias al volumen `db_data`.
