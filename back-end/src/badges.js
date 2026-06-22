import { PUBLIC_API_ORIGIN } from "./config.js";

export const achievements = {
  "curso-node-basico": {
    id: `${PUBLIC_API_ORIGIN}/api/achievements/curso-node-basico`,
    type: ["Achievement"],
    name: "Curso básico de Node.js",
    description: "Reconoce que el estudiante completó los fundamentos de Node.js.",
    criteria: {
      narrative: "El estudiante completó las lecciones, ejercicios y evaluación final."
    },
    image: {
      id: `${PUBLIC_API_ORIGIN}/api/images/node-badge.svg`,
      type: "Image"
    }
  }
};
