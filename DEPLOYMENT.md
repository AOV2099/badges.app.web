# Despliegue con Docker Compose / Portainer

Este proyecto ahora puede correr en local o en contenedores.

## Servicios

- `backend`: API Express de Open Badges.
- `frontend`: app Svelte compilada y servida con Nginx.
- `badges_data`: volumen persistente para achievements y badges emitidas.

## Puertos por defecto

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001`

## Ejecutar con Docker Compose

```bash
docker compose up --build
```

## Usar en Portainer

1. Crea un nuevo Stack.
2. Pega el contenido de `docker-compose.yml`.
3. Configura las variables de entorno recomendadas:

```txt
FRONTEND_PORT=8080
BACKEND_PORT=3001
BACKEND_PUBLIC_URL=http://TU_HOST:3001
FRONTEND_API_BASE_URL=/api
CORS_ORIGIN=*
BADGE_SIGNING_SECRET=cambia-este-secreto
BADGE_VALIDITY_DAYS=365
```

4. Despliega el stack.
5. Abre el frontend en `http://TU_HOST:8080`.

## Notas importantes

- Si expones el backend con otro dominio o proxy, actualiza `BACKEND_PUBLIC_URL`.
- `FRONTEND_API_BASE_URL=/api` usa el proxy interno de Nginx hacia `backend:3001`.
- El volumen `badges_data` conserva badges y achievements aunque recrees contenedores.
- Cambia siempre `BADGE_SIGNING_SECRET` en Portainer.
