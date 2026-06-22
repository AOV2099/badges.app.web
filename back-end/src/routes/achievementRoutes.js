export function registerAchievementRoutes(
  app,
  {
    listAchievementsFromDb,
    normalizeAchievementPayload,
    findAchievementFromDb,
    createAchievementInDb,
    updateAchievementInDb,
    deleteAchievementFromDb,
    achievementHasIssuedBadges,
    getPublicIssuerProfile
  }
) {
  app.get("/api/achievements", async (req, res) => {
    try {
      res.json(await listAchievementsFromDb());
    } catch (error) {
      console.error("Could not list achievements:", error);
      res.status(500).json({ error: "Could not list achievements" });
    }
  });

  app.post("/api/achievements", async (req, res) => {
    try {
      const result = normalizeAchievementPayload(req.body);

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      const existingAchievement = await findAchievementFromDb(result.id);
      if (existingAchievement) {
        return res.status(409).json({ error: "Achievement already exists" });
      }

      const createdAchievement = await createAchievementInDb({
        id: result.id,
        achievement: result.achievement,
        requesterEmail: req.body?.requesterEmail,
        issuerProfile: await getPublicIssuerProfile()
      });

      res.status(201).json(createdAchievement);
    } catch (error) {
      console.error("Could not create achievement:", error);
      res.status(500).json({ error: error.message || "Could not create achievement" });
    }
  });

  app.get("/api/achievements/:id", async (req, res) => {
    try {
      const achievement = await findAchievementFromDb(req.params.id);

      if (!achievement) {
        return res.status(404).json({ error: "Achievement not found" });
      }

      res.json(achievement);
    } catch (error) {
      console.error("Could not load achievement:", error);
      res.status(500).json({ error: "Could not load achievement" });
    }
  });

  app.put("/api/achievements/:id", async (req, res) => {
    try {
      const existingAchievement = await findAchievementFromDb(req.params.id);

      if (!existingAchievement) {
        return res.status(404).json({ error: "Achievement not found" });
      }

      if (await achievementHasIssuedBadges(req.params.id)) {
        return res.status(409).json({
          error: "Achievement has issued badges and cannot be edited"
        });
      }

      const result = normalizeAchievementPayload(req.body, req.params.id);

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      const updatedAchievement = await updateAchievementInDb({
        id: req.params.id,
        achievement: result.achievement,
        requesterEmail: req.body?.requesterEmail,
        issuerProfile: await getPublicIssuerProfile()
      });

      res.json(updatedAchievement);
    } catch (error) {
      console.error("Could not update achievement:", error);
      res.status(500).json({ error: error.message || "Could not update achievement" });
    }
  });

  app.delete("/api/achievements/:id", async (req, res) => {
    try {
      const existingAchievement = await findAchievementFromDb(req.params.id);

      if (!existingAchievement) {
        return res.status(404).json({ error: "Achievement not found" });
      }

      if (await achievementHasIssuedBadges(req.params.id)) {
        return res.status(409).json({
          error: "Achievement has issued badges and cannot be deleted"
        });
      }

      await deleteAchievementFromDb(req.params.id);

      res.status(204).send();
    } catch (error) {
      console.error("Could not delete achievement:", error);
      res.status(500).json({ error: error.message || "Could not delete achievement" });
    }
  });
}
