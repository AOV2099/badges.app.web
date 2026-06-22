import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { PORT, PUBLIC_API_ORIGIN } from "./config.js";
import { closeDatabase, initializeDatabaseConnection, upsertIssuerProfile } from "./db.js";
import { getPublicIssuerProfile } from "./services/issuerService.js";
import { registerAppRoutes } from "./routes/index.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use("/api/images", express.static(path.join(__dirname, "../public/images")));

registerAppRoutes(app);

app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  return res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  try {
    await initializeDatabaseConnection();
    await upsertIssuerProfile(await getPublicIssuerProfile());

    const server = app.listen(PORT, () => {
      console.log(`Open Badges local server running on ${PUBLIC_API_ORIGIN}`);
    });

    async function shutdown(signal) {
      console.log(`${signal} received. Closing server and database connections...`);
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    }

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Could not start Open Badges server:", error);
    await closeDatabase().catch(() => {});
    process.exit(1);
  }
}

startServer();
