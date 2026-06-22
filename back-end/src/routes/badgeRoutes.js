import { v4 as uuidv4 } from "uuid";

export function registerBadgeRoutes(
  app,
  {
    validateIssueRequest,
    resolveValidUntil,
    normalizeEmail,
    isSuperUserType,
    findAchievementFromDb,
    createIssuedBadgeInDb,
    listIssuedBadgesFromDb,
    findIssuedBadgeFromDb,
    revokeIssuedBadgeInDb,
    approveIssuedBadgeInDb,
    deleteIssuedBadgeFromDb,
    verifyCredentialJwt,
    verifyIssuedBadge,
    signCredential,
    getPublicIssuerProfile,
    getDownloadableBadgeJwt,
    buildPublicBadgeResponse,
    findUserByEmail,
    requireAdminOrSuperAccess,
    PUBLIC_API_ORIGIN
  }
) {
  app.post("/api/badges/issue", async (req, res) => {
    const { recipientEmail, recipientName, achievementId, requesterEmail } = req.body;
    const validationError = validateIssueRequest(req.body);

    if (validationError) {
      return res.status(400).json({
        error: validationError
      });
    }

    const achievement = await findAchievementFromDb(achievementId);

    if (!achievement) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    const badgeId = uuidv4();
    const issuedAt = new Date();
    const validUntil = resolveValidUntil(achievement, issuedAt);
    const revocable = achievement.revocable !== false;
    const autoRevocation = achievement.validityPreset !== "none";

    const credentialIssuer = await getPublicIssuerProfile();
    const credential = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
      ],
      id: `${PUBLIC_API_ORIGIN}/api/badges/${badgeId}`,
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      issuer: credentialIssuer,
      validFrom: issuedAt.toISOString(),
      credentialStatus: {
        id: `${PUBLIC_API_ORIGIN}/api/badges/${badgeId}`,
        type: "CredentialStatus",
        status: "active",
        revocable,
        autoRevocation
      },
      credentialSubject: {
        id: `mailto:${normalizeEmail(recipientEmail)}`,
        type: ["AchievementSubject"],
        name: String(recipientName).trim(),
        achievement
      }
    };

    if (validUntil) {
      credential.validUntil = validUntil.toISOString();
    }

    const jwt = await signCredential(credential);

    const requester = requesterEmail ? await findUserByEmail(normalizeEmail(requesterEmail)) : null;
    const requesterType = String(requester?.type || "").toLowerCase();
    const requiresApproval = !(isSuperUserType(requesterType) || requesterType === "administrador");

    try {
      const issuedBadge = await createIssuedBadgeInDb({
        id: badgeId,
        credential,
        jwt,
        achievementId,
        recipientEmail: normalizeEmail(recipientEmail),
        recipientName: String(recipientName).trim(),
        validUntil: validUntil ? validUntil.toISOString() : null,
        revocable,
        autoRevocation,
        requiresApproval,
        requesterEmail,
        issuerProfile: credentialIssuer
      });

      res.status(201).json(issuedBadge);
    } catch (error) {
      console.error("Could not save issued badge:", error);
      return res.status(500).json({ error: error.message || "Could not save issued badge" });
    }
  });

  app.get("/api/badges", async (req, res) => {
    try {
      res.json(await listIssuedBadgesFromDb());
    } catch (error) {
      console.error("Could not load badges:", error);
      res.status(500).json({ error: "Could not load badges" });
    }
  });

  app.get("/api/public/badges/:id", async (req, res) => {
    const badge = await findIssuedBadgeFromDb(req.params.id);

    if (!badge) {
      return res.status(404).json({ error: "Badge not found" });
    }

    if (badge.status === "pending_review") {
      return res.status(404).json({ error: "Badge not found" });
    }

    res.set("Cache-Control", "no-store");
    res.json(await buildPublicBadgeResponse(badge));
  });

  app.get("/api/badges/:id", async (req, res) => {
    const badge = await findIssuedBadgeFromDb(req.params.id);

    if (!badge) {
      return res.status(404).json({ error: "Badge not found" });
    }

    res.json(badge);
  });

  app.get("/api/badges/:id/jwt", async (req, res) => {
    const badge = await findIssuedBadgeFromDb(req.params.id);

    if (!badge) {
      return res.status(404).json({ error: "Badge not found" });
    }

    if (badge.status === "pending_review") {
      return res.status(409).json({ error: "Badge is pending approval" });
    }

    res.type("text/plain").send(await getDownloadableBadgeJwt(badge));
  });

  app.post("/api/badges/:id/revoke", async (req, res) => {
    const badge = await findIssuedBadgeFromDb(req.params.id);

    if (!badge) {
      return res.status(404).json({ error: "Badge not found" });
    }

    if (badge.status === "revoked") {
      return res.status(409).json({ error: "Badge is already revoked" });
    }

    if (badge.status === "pending_review") {
      return res.status(409).json({ error: "Badge is pending approval and cannot be revoked" });
    }

    if (badge.revocable === false || badge.credential?.credentialStatus?.revocable === false) {
      return res.status(403).json({ error: "Badge is not revocable" });
    }

    const revokedAt = new Date().toISOString();
    const revokedReason = String(req.body?.reason || "No reason provided").trim();
    const revokedCredential = {
      ...badge.credential,
      credentialStatus: {
        ...badge.credential?.credentialStatus,
        status: "revoked",
        revokedAt,
        revokedReason
      }
    };

    try {
      const revokedBadge = await revokeIssuedBadgeInDb({
        id: badge.id,
        credential: revokedCredential,
        revokedAt,
        revokedReason
      });

      res.json(revokedBadge);
    } catch (error) {
      console.error("Could not revoke badge:", error);
      res.status(500).json({ error: error.message || "Could not revoke badge" });
    }
  });

  app.post("/api/badges/:id/approve", async (req, res) => {
    try {
      const { requesterEmail } = req.body || {};
      const access = await requireAdminOrSuperAccess(requesterEmail);

      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const badge = await findIssuedBadgeFromDb(req.params.id);
      if (!badge) {
        return res.status(404).json({ error: "Badge not found" });
      }

      if (badge.status === "revoked") {
        return res.status(409).json({ error: "Revoked badges cannot be approved" });
      }

      if (badge.approved) {
        return res.status(409).json({ error: "Badge is already approved" });
      }

      const requesterType = String(access.requester.type || "").toLowerCase();
      const requesterDivisionId = String(access.requester.division_id || "").trim().toLowerCase();
      const badgeDivisionId = String(badge.divisionId || "").trim().toLowerCase();

      if (
        requesterType === "administrador"
        && (!requesterDivisionId || !badgeDivisionId || requesterDivisionId !== badgeDivisionId)
      ) {
        return res.status(403).json({
          error: "Administrators can only approve badges from their own division"
        });
      }

      const approvedBadge = await approveIssuedBadgeInDb({
        id: badge.id,
        approvedByUserId: access.requester.id
      });

      res.json(approvedBadge);
    } catch (error) {
      console.error("Could not approve badge:", error);
      res.status(500).json({ error: "Could not approve badge" });
    }
  });

  app.delete("/api/badges/:id", async (req, res) => {
    try {
      const badge = await findIssuedBadgeFromDb(req.params.id);
      if (!badge) {
        return res.status(404).json({ error: "Badge not found" });
      }

      if (badge.status === "pending_review") {
        return res.status(409).json({ error: "Badge is pending approval and cannot be deleted" });
      }

      const deleted = await deleteIssuedBadgeFromDb(req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: "Badge not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Could not delete badge:", error);
      res.status(500).json({ error: error.message || "Could not delete badge" });
    }
  });

  app.post("/api/badges/verify", async (req, res) => {
    const { jwt } = req.body;

    if (!jwt) {
      return res.status(400).json({ error: "jwt is required" });
    }

    try {
      const payload = await verifyCredentialJwt(jwt);
      const result = verifyIssuedBadge(payload, await listIssuedBadgesFromDb());

      res.json({
        ...result,
        payload
      });
    } catch (error) {
      res.status(400).json({
        valid: false,
        checks: {
          signature: false
        },
        error: error.message
      });
    }
  });
}
