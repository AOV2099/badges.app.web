export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "BADGES Open Badges API",
    version: "1.0.0",
    description: "API para emisión, administración y verificación de Open Badges 3.0."
  },
  servers: [
    {
      url: "/api",
      description: "API local"
    }
  ],
  paths: {
    "/db/health": {
      get: {
        tags: ["Health"],
        summary: "Estado de la conexión a base de datos",
        responses: {
          200: { description: "Base de datos disponible" },
          503: { description: "Base de datos no disponible" }
        }
      }
    },
    "/auth/password/login": {
      post: {
        tags: ["Auth"],
        summary: "Inicio de sesión con usuario local",
        responses: {
          200: { description: "Acceso concedido" },
          401: { description: "Credenciales inválidas" }
        }
      }
    },
    "/auth/google/start": {
      get: {
        tags: ["Auth"],
        summary: "Inicia el flujo OAuth de Google",
        parameters: [
          { name: "state", in: "query", required: true, schema: { type: "string" } }
        ],
        responses: {
          302: { description: "Redirección a Google" },
          503: { description: "OAuth no configurado" }
        }
      }
    },
    "/auth/google/callback": {
      get: {
        tags: ["Auth"],
        summary: "Callback OAuth de Google",
        responses: {
          302: { description: "Redirección al frontend" }
        }
      }
    },
    "/auth_google_callback.php": {
      get: {
        tags: ["Auth"],
        summary: "Callback OAuth de Google compatible con redirect URI legado",
        responses: {
          302: { description: "Redirección al frontend" }
        }
      }
    },
    "/issuer": {
      get: {
        tags: ["Issuer"],
        summary: "Perfil público del emisor",
        responses: {
          200: { description: "Perfil del emisor" }
        }
      }
    },
    "/issuer/keys/1": {
      get: {
        tags: ["Issuer"],
        summary: "Llave pública JWK del emisor",
        responses: {
          200: { description: "JWK pública" }
        }
      }
    },
    "/achievements": {
      get: {
        tags: ["Achievements"],
        summary: "Lista logros",
        responses: { 200: { description: "Lista de logros" } }
      },
      post: {
        tags: ["Achievements"],
        summary: "Crea un logro",
        responses: {
          201: { description: "Logro creado" },
          400: { description: "Solicitud inválida" },
          409: { description: "Logro duplicado" }
        }
      }
    },
    "/achievements/{id}": {
      get: {
        tags: ["Achievements"],
        summary: "Obtiene un logro",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Logro" }, 404: { description: "No encontrado" } }
      },
      put: {
        tags: ["Achievements"],
        summary: "Actualiza un logro",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Logro actualizado" }, 409: { description: "No editable" } }
      },
      delete: {
        tags: ["Achievements"],
        summary: "Elimina un logro",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 204: { description: "Eliminado" }, 409: { description: "No eliminable" } }
      }
    },
    "/badges": {
      get: {
        tags: ["Badges"],
        summary: "Lista insignias emitidas",
        responses: { 200: { description: "Lista de insignias" } }
      }
    },
    "/badges/issue": {
      post: {
        tags: ["Badges"],
        summary: "Emite una insignia",
        responses: { 201: { description: "Insignia emitida o enviada a revisión" } }
      }
    },
    "/badges/verify": {
      post: {
        tags: ["Badges"],
        summary: "Verifica un JWT de insignia",
        responses: { 200: { description: "Resultado de verificación" }, 400: { description: "JWT inválido" } }
      }
    },
    "/badges/{id}": {
      get: {
        tags: ["Badges"],
        summary: "Obtiene una insignia",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Insignia" }, 404: { description: "No encontrada" } }
      },
      delete: {
        tags: ["Badges"],
        summary: "Elimina una insignia",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 204: { description: "Eliminada" }, 409: { description: "No eliminable" } }
      }
    },
    "/badges/{id}/jwt": {
      get: {
        tags: ["Badges"],
        summary: "Descarga JWT de una insignia",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "JWT en texto plano" }, 409: { description: "Pendiente de aprobación" } }
      }
    },
    "/badges/{id}/revoke": {
      post: {
        tags: ["Badges"],
        summary: "Revoca una insignia",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Insignia revocada" }, 403: { description: "No revocable" } }
      }
    },
    "/badges/{id}/approve": {
      post: {
        tags: ["Badges"],
        summary: "Aprueba una insignia pendiente",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Insignia aprobada" }, 403: { description: "Sin permisos" } }
      }
    },
    "/public/badges/{id}": {
      get: {
        tags: ["Public"],
        summary: "Consulta pública de una insignia",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Insignia pública" }, 404: { description: "No encontrada" } }
      }
    },
    "/admin/divisions": {
      get: { tags: ["Admin"], summary: "Lista divisiones", responses: { 200: { description: "Divisiones" } } },
      post: { tags: ["Admin"], summary: "Crea división", responses: { 201: { description: "División creada" } } }
    },
    "/admin/users": {
      get: { tags: ["Admin"], summary: "Lista usuarios administrables", responses: { 200: { description: "Usuarios" } } },
      post: { tags: ["Admin"], summary: "Crea usuario administrable", responses: { 201: { description: "Usuario creado" } } }
    },
    "/admin/users/{id}": {
      put: {
        tags: ["Admin"],
        summary: "Actualiza usuario administrable",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Usuario actualizado" } }
      }
    },
    "/admin/pending-badges": {
      get: { tags: ["Admin"], summary: "Lista insignias pendientes", responses: { 200: { description: "Pendientes" } } }
    },
    "/admin/pending-badges/actions": {
      post: { tags: ["Admin"], summary: "Aprueba o rechaza insignias pendientes", responses: { 200: { description: "Resultado de acción" } } }
    },
    "/admin/pending-badges/events": {
      get: { tags: ["Admin"], summary: "Lista eventos de revisión", responses: { 200: { description: "Eventos" } } }
    },
    "/images/node-badge.svg": {
      get: { tags: ["Assets"], summary: "Imagen SVG de ejemplo", responses: { 200: { description: "SVG" } } }
    }
  }
};
