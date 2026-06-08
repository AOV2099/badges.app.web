const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

export const achievements = {
  "curso-node-basico": {
    id: `${baseUrl}/achievements/curso-node-basico`,
    type: ["Achievement"],
    name: "Curso básico de Node.js",
    description: "Reconoce que el estudiante completó los fundamentos de Node.js.",
    criteria: {
      narrative: "El estudiante completó las lecciones, ejercicios y evaluación final."
    },
    image: {
      id: `${baseUrl}/images/node-badge.svg`,
      type: "Image"
    }
  }
};
