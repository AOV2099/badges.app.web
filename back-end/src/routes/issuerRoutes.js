export function registerIssuerRoutes(app, { getPublicIssuerProfile, getPublicJwk }) {
  app.get("/api/issuer", async (req, res) => {
    res.json(await getPublicIssuerProfile());
  });

  app.get("/api/issuer/keys/1", async (req, res) => {
    res.json(await getPublicJwk());
  });
}
