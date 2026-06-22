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
docker build -t badges-backend ./back-end
docker build -t badges-frontend ./front-end
```

El backend expone `3001`; el frontend expone `80` y proxifica `/api` hacia el host `badges-backend:3001` dentro de la red Docker.
