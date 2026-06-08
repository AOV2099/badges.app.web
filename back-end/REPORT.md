# Reporte de cambios del backend

## Resumen

Se reforzó el backend demostrativo de Open Badges 3.0 para que arranque correctamente, exponga endpoints más completos y verifique estado, expiración y revocación además de la firma JWT.

## Cambios realizados

- Se habilitó ESM con `"type": "module"` para que `npm start` ejecute los `import`.
- Se agregó configuración por variables de entorno para `PORT`, `BASE_URL`, `CORS_ORIGIN`, `BADGE_VALIDITY_DAYS`, `BADGE_SIGNING_SECRET`, `ISSUER_ID` y `BADGES_DATA_PATH`.
- Se corrigió la ruta de persistencia para guardar emisiones dentro de `back-end/data/issued-badges.json`.
- Se agregaron listados públicos: `GET /achievements` y `GET /badges`.
- Se agregó CRUD de achievements: `POST /achievements`, `PUT /achievements/:id` y `DELETE /achievements/:id`.
- Se agregó descarga directa del JWT con `GET /badges/:id/jwt`.
- Se agregó revocación básica con `POST /badges/:id/revoke`.
- Se agregó eliminación local de registros emitidos con `DELETE /badges/:id`.
- Se agregó `validUntil` y `credentialStatus` a cada credencial emitida.
- Se mejoró `POST /badges/verify` para validar firma, issuer, existencia local, expiración y revocación.
- Se agregó validación básica de entrada para email, nombre y achievement.
- Se agregó política por achievement para `validUntil` y `revocable`.
- La emisión hereda expiración y revocabilidad del achievement.
- La revocación responde `403` si la badge fue emitida como no revocable.
- Se agregó límite de JSON body y manejo de JSON inválido.
- Se agregó un asset SVG servido desde `/images/node-badge.svg`.

## Endpoints disponibles

- `GET /`
- `GET /issuer`
- `GET /achievements`
- `POST /achievements`
- `GET /achievements/:id`
- `PUT /achievements/:id`
- `DELETE /achievements/:id`
- `POST /badges/issue`
- `GET /badges`
- `GET /badges/:id`
- `GET /badges/:id/jwt`
- `POST /badges/:id/revoke`
- `DELETE /badges/:id`
- `POST /badges/verify`
- `GET /images/node-badge.svg`

## Notas

Este backend sigue siendo demostrativo. Para producción faltaría reemplazar la firma `HS256` por llaves asimétricas publicables, implementar autenticación para emitir/revocar, agregar base de datos real, auditoría, pruebas automatizadas y validación completa contra el schema oficial de Open Badges 3.0.

Para evitar conflictos con otros proyectos que usen `localhost:3000`, se agregó el script `npm run dev:badges`, que levanta este backend en `http://localhost:3001`.

También se agregó soporte de contenedores con `Dockerfile` para backend/frontend y `docker-compose.yml` para despliegue en Docker Compose o Portainer.

## Validación ejecutada

- Se validó sintaxis con `node --check` en los módulos del backend.
- Se arrancó el servidor en un puerto local temporal.
- Se probó `GET /achievements`.
- Se emitió una credencial con `POST /badges/issue`.
- Se verificó como activa con `POST /badges/verify`.
- Se revocó con `POST /badges/:id/revoke`.
- Se volvió a verificar el mismo JWT y correctamente respondió `valid: false` por revocación.
