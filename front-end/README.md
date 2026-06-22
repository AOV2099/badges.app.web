# Badges Admin Front

Frontend demostrativo en Svelte + Tailwind con componentes estilo shadcn-svelte para administrar el issuer local de Open Badges 3.0.

El layout visual está adaptado desde el proyecto de Stitch `Stitch Badges Admin Portal` en versión desktop: sidebar navy, workspace claro, métricas, tablas administrativas y visor técnico de JWT.

## Funciones

- Crear, listar, editar y eliminar achievements.
- Previsualizar imagen del achievement al crearlo o editarlo.
- Configurar fecha de expiración y si las badges son revocables.
- Emitir badges para un receptor.
- Previsualizar la badge como diploma antes y después de emitir.
- Ver una pantalla pública tipo certificado/diploma.
- Consultar actividad reciente de emisiones y revocaciones.
- Listar badges emitidos.
- Ver detalle de credenciales.
- Copiar JWT.
- Verificar firma, issuer, expiración y revocación.
- Revocar badges.
- Eliminar registros locales de badges.
- Consumir el backend desde `/api`.

## Ejecutar

```bash
cd front-end
npm install
npm run dev
```

Por defecto el frontend consume la API en:

```txt
/api
```

En desarrollo, Vite proxifica `/api` al backend local.

## Backend requerido

Levanta el backend en otra terminal:

```bash
cd back-end
npm run dev:badges
```

Ese script usa `PORT=3001` para evitar conflictos con otros proyectos que usen `localhost:3000`.

El frontend consume `/api`; en desarrollo Vite lo proxifica al backend local.
