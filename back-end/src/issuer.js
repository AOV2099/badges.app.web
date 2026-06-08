const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

export const issuer = {
  id: process.env.ISSUER_ID || `${baseUrl}/issuer`,
  type: ["Profile"],
  name: "Aragón Academia Local de Pruebas",
  url: baseUrl,
  email: "certificados@aragon.academia.local",
  description: "Emisor local para pruebas de Open Badges 3.0"
};
