import { PUBLIC_API_ORIGIN } from "./config.js";

export const issuer = {
  id: process.env.ISSUER_ID || `${PUBLIC_API_ORIGIN}/api/issuer`,
  type: ["Profile"],
  name: "Aragón Academia Local de Pruebas",
  url: PUBLIC_API_ORIGIN,
  email: "certificados@aragon.academia.local",
  description: "Emisor local para pruebas de Open Badges 3.0"
};
