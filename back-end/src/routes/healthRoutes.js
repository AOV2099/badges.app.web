export function registerHealthRoutes(app, { getDatabaseHealth }) {
  app.get("/api/db/health", async (req, res) => {
    const health = await getDatabaseHealth();
    res.status(health.ok ? 200 : 503).json(health);
  });
}
