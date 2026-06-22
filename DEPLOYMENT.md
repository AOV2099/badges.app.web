# Ejecución local (sin Docker)

## Requisitos

- Node.js 20+
- PostgreSQL 16+

## Variables de entorno

Define en `.env` al menos:

```txt
DB_HOST=localhost
DB_PORT=5432
DB_NAME=open_badges
DB_USER=badges
DB_PASSWORD=badges
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth_google_callback.php
```

`GOOGLE_REDIRECT_URI` es la URL pública del callback de Google y de ahí se deriva el origen usado por los IDs Open Badges.

## Backend

1. Instala dependencias en [back-end/package.json](back-end/package.json):

```bash
cd back-end
npm install
```

2. Inicia el backend:

```bash
npm run dev:badges
```

Backend disponible en `http://localhost:3001`.

## Frontend

1. Instala dependencias y arranca Vite:

```bash
cd front-end
npm install
npm run dev
```

Frontend disponible en `http://localhost:5173`.

El frontend consume `/api`; Vite lo proxifica al backend local en `http://localhost:3001`.

## Docker opcional

Construye las imágenes desde la raíz del repo:

```bash
docker build -t badges-backend:latest ./back-end
docker build -t badges-frontend:latest ./front-end
```

Crea red y volumen persistente:

```bash
docker network create badges-network
docker volume create badges_data
```

Ejecuta el backend:

```bash
docker run -d \
	--name badges-backend \
	--network badges-network \
	--network-alias backend \
	--network-alias badges-backend \
	-p 3009:3001 \
	--env-file .env \
	-e PORT=3001 \
	-e GOOGLE_REDIRECT_URI=http://132.248.44.4:3009/api/auth_google_callback.php \
	-v badges_data:/app/data \
	badges-backend:latest
```

Ejecuta el frontend:

```bash
docker run -d \
	--name badges-frontend \
	--network badges-network \
	-p 3008:80 \
	badges-frontend:latest
```

Elimina `BASE_URL`, `CORS_ORIGIN`, `BADGE_SIGNING_SECRET`, `BADGES_DATA_PATH` y `ACHIEVEMENTS_DATA_PATH`: ya no se usan. `GOOGLE_REDIRECT_URI` define el origen público de Open Badges, y la llave RSA de firma se guarda en el volumen `badges_data`.

Si PostgreSQL corre en el host y no dentro de la red Docker, agrega al backend `--add-host=host.docker.internal:host-gateway` y configura `DB_HOST=host.docker.internal` en `.env`.
