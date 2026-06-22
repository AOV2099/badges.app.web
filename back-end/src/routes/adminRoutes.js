export function registerAdminRoutes(
  app,
  {
    requireSuperUserAccess,
    requireAdminOrSuperAccess,
    normalizeDivisionAbbreviation,
    normalizeUserType,
    normalizeEmail,
    divisionAbbreviationPattern,
    emailPattern,
    isSuperUserType,
    listDivisions,
    createDivision,
    listManageableUsers,
    createManagedUser,
    updateManagedUser,
    listPendingIssuedBadgesForReviewer,
    findIssuedBadgeFromDb,
    approveIssuedBadgeInDb,
    deleteIssuedBadgeFromDb,
    createPendingBadgeReviewEventInDb,
    listPendingBadgeReviewEventsForReviewer,
    bcrypt
  }
) {
  app.get("/api/admin/divisions", async (req, res) => {
    try {
      const access = await requireSuperUserAccess(req.query.requesterEmail);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      res.json(await listDivisions());
    } catch (error) {
      console.error("Could not load divisions:", error);
      res.status(500).json({ error: "Could not load divisions" });
    }
  });

  app.post("/api/admin/divisions", async (req, res) => {
    try {
      const { requesterEmail, name, abbreviation } = req.body || {};

      const access = await requireSuperUserAccess(requesterEmail);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const normalizedName = String(name || "").trim();
      if (normalizedName.length < 2) {
        return res.status(400).json({ error: "name must contain at least 2 characters" });
      }

      const divisionId = normalizeDivisionAbbreviation(abbreviation);
      if (!divisionId || !divisionAbbreviationPattern.test(divisionId)) {
        return res.status(400).json({ error: "abbreviation must contain only letters, numbers or hyphen" });
      }

      const createdDivision = await createDivision({
        id: divisionId,
        name: normalizedName
      });

      res.status(201).json(createdDivision);
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "Division id or name already exists" });
      }

      console.error("Could not create division:", error);
      res.status(500).json({ error: "Could not create division" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const access = await requireAdminOrSuperAccess(req.query.requesterEmail);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const requesterType = String(access.requester.type || "").toLowerCase();
      const isRequesterSuperUser = isSuperUserType(requesterType);
      const requesterDivisionId = String(access.requester.division_id || "").trim().toLowerCase();

      if (!isRequesterSuperUser && !requesterDivisionId) {
        return res.status(403).json({ error: "Administrator user has no assigned division" });
      }

      const users = await listManageableUsers({
        search: req.query.search,
        excludeEmail: isRequesterSuperUser ? access.requester.email : "",
        divisionId: isRequesterSuperUser ? "" : requesterDivisionId
      });

      res.json(users);
    } catch (error) {
      console.error("Could not load users for users module:", error);
      res.status(500).json({ error: "Could not load users" });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const {
        requesterEmail,
        name,
        email,
        type,
        divisionId,
        enabled = true,
        provider = "local",
        password
      } = req.body || {};

      const access = await requireSuperUserAccess(requesterEmail);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const normalizedType = normalizeUserType(type);
      if (!["administrador", "general"].includes(normalizedType)) {
        return res.status(400).json({ error: "type must be administrador or general" });
      }

      const normalizedProvider = String(provider || "local").trim().toLowerCase();
      if (!["local", "google"].includes(normalizedProvider)) {
        return res.status(400).json({ error: "provider must be local or google" });
      }

      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
        return res.status(400).json({ error: "email must be valid" });
      }

      const normalizedName = String(name || "").trim();
      if (normalizedName.length < 2) {
        return res.status(400).json({ error: "name must contain at least 2 characters" });
      }

      const normalizedDivisionId = String(divisionId || "").trim();
      if (!normalizedDivisionId) {
        return res.status(400).json({ error: "divisionId is required" });
      }

      let passwordHash = null;
      let providerSubject = null;

      if (normalizedProvider === "local") {
        const rawPassword = String(password || "").trim();
        if (rawPassword.length < 8) {
          return res.status(400).json({ error: "password must contain at least 8 characters for local users" });
        }

        passwordHash = await bcrypt.hash(rawPassword, 12);
        providerSubject = normalizedEmail;
      }

      if (normalizedProvider === "google") {
        providerSubject = normalizedEmail;
      }

      const createdUser = await createManagedUser({
        name: normalizedName,
        email: normalizedEmail,
        type: normalizedType,
        divisionId: normalizedDivisionId,
        enabled: Boolean(enabled),
        provider: normalizedProvider,
        passwordHash,
        providerSubject
      });

      res.status(201).json(createdUser);
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "A user with this email already exists" });
      }

      console.error("Could not create managed user:", error);
      res.status(500).json({ error: "Could not create user" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const {
        requesterEmail,
        name,
        email,
        type,
        divisionId,
        enabled = true
      } = req.body || {};

      const access = await requireSuperUserAccess(requesterEmail);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const userId = String(req.params.id || "").trim();
      if (!userId) {
        return res.status(400).json({ error: "id is required" });
      }

      const normalizedType = normalizeUserType(type);
      if (!["administrador", "general"].includes(normalizedType)) {
        return res.status(400).json({ error: "type must be administrador or general" });
      }

      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
        return res.status(400).json({ error: "email must be valid" });
      }

      const normalizedName = String(name || "").trim();
      if (normalizedName.length < 2) {
        return res.status(400).json({ error: "name must contain at least 2 characters" });
      }

      const normalizedDivisionId = String(divisionId || "").trim();
      if (!normalizedDivisionId) {
        return res.status(400).json({ error: "divisionId is required" });
      }

      const updatedUser = await updateManagedUser({
        id: userId,
        name: normalizedName,
        email: normalizedEmail,
        type: normalizedType,
        divisionId: normalizedDivisionId,
        enabled: Boolean(enabled)
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "A user with this email already exists" });
      }

      console.error("Could not update managed user:", error);
      res.status(500).json({ error: "Could not update user" });
    }
  });

  app.get("/api/admin/pending-badges", async (req, res) => {
    try {
      const access = await requireAdminOrSuperAccess(req.query.requesterEmail);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const pendingBadges = await listPendingIssuedBadgesForReviewer({
        reviewerType: access.requester.type,
        reviewerDivisionId: access.requester.division_id,
        search: req.query.search
      });

      res.json(pendingBadges);
    } catch (error) {
      console.error("Could not load pending badges:", error);
      res.status(500).json({ error: "Could not load pending badges" });
    }
  });

  app.post("/api/admin/pending-badges/actions", async (req, res) => {
    try {
      const { requesterEmail, badgeIds, action } = req.body || {};
      const access = await requireAdminOrSuperAccess(requesterEmail);

      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const normalizedAction = String(action || "").trim().toLowerCase();
      if (!["approve", "deny"].includes(normalizedAction)) {
        return res.status(400).json({ error: "action must be approve or deny" });
      }

      const normalizedBadgeIds = Array.from(
        new Set(
          (Array.isArray(badgeIds) ? badgeIds : [])
            .map((badgeId) => String(badgeId || "").trim())
            .filter(Boolean)
        )
      );

      if (!normalizedBadgeIds.length) {
        return res.status(400).json({ error: "badgeIds must contain at least one badge id" });
      }

      const requesterType = String(access.requester.type || "").toLowerCase();
      const requesterDivisionId = String(access.requester.division_id || "").trim().toLowerCase();

      const processed = [];
      const skipped = [];

      for (const badgeId of normalizedBadgeIds) {
        const badge = await findIssuedBadgeFromDb(badgeId);

        if (!badge) {
          skipped.push({ id: badgeId, reason: "Badge not found" });
          continue;
        }

        if (badge.status !== "pending_review") {
          skipped.push({ id: badgeId, reason: "Badge is not pending review" });
          continue;
        }

        const badgeDivisionId = String(badge.divisionId || "").trim().toLowerCase();
        if (
          requesterType === "administrador"
          && (!requesterDivisionId || !badgeDivisionId || requesterDivisionId !== badgeDivisionId)
        ) {
          skipped.push({ id: badgeId, reason: "Administrators can only process pending badges from their own division" });
          continue;
        }

        if (normalizedAction === "approve") {
          const approvedBadge = await approveIssuedBadgeInDb({
            id: badge.id,
            approvedByUserId: access.requester.id
          });
          processed.push({ id: badge.id, status: approvedBadge?.status || "active", action: "approved" });
          continue;
        }

        await deleteIssuedBadgeFromDb(badge.id);
        processed.push({ id: badge.id, status: "deleted", action: "denied" });
      }

      const event = await createPendingBadgeReviewEventInDb({
        reviewerUserId: access.requester.id,
        reviewerEmail: access.requester.email,
        reviewerType: access.requester.type,
        reviewerDivisionId: access.requester.division_id,
        action: normalizedAction,
        processed,
        skipped
      });

      res.json({
        action: normalizedAction,
        processed,
        skipped,
        event
      });
    } catch (error) {
      console.error("Could not process pending badges action:", error);
      res.status(500).json({ error: "Could not process pending badges action" });
    }
  });

  app.get("/api/admin/pending-badges/events", async (req, res) => {
    try {
      const access = await requireAdminOrSuperAccess(req.query.requesterEmail);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const events = await listPendingBadgeReviewEventsForReviewer({
        reviewerType: access.requester.type,
        reviewerDivisionId: access.requester.division_id,
        limit: req.query.limit || 100
      });

      res.json(events);
    } catch (error) {
      console.error("Could not load pending badge review events:", error);
      res.status(500).json({ error: "Could not load pending badge review events" });
    }
  });
}
