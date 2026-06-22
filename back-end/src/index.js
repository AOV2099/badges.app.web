import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { issuer } from "./issuer.js";
import {
  approveIssuedBadgeInDb,
  achievementHasIssuedBadges,
  closeDatabase,
  createAchievementInDb,
  createDivision,
  createIssuedBadgeInDb,
  createPendingBadgeReviewEventInDb,
  createManagedUser,
  deleteAchievementFromDb,
  deleteIssuedBadgeFromDb,
  findAchievementFromDb,
  findIssuedBadgeFromDb,
  findUserByEmail,
  getDatabaseHealth,
  initializeDatabaseConnection,
  isSuperUserType,
  listAchievementsFromDb,
  listDivisions,
  listIssuedBadgesFromDb,
  listPendingBadgeReviewEventsForReviewer,
  listPendingIssuedBadgesForReviewer,
  listManageableUsers,
  revokeIssuedBadgeInDb,
  upsertIssuerProfile,
  updateAchievementInDb,
  updateManagedUser
} from "./db.js";
import { verifyPasswordLogin } from "./passwordAuth.js";
import { getKeyId, getPublicJwk, signCredential, verifyCredentialJwt } from "./signer.js";
import { verifyIssuedBadge } from "./verifier.js";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const BASE_URL = process.env.BACKEND_PUBLIC_URL || process.env.BASE_URL || `http://localhost:${PORT}`;
const DEFAULT_VALIDITY_DAYS = Number(process.env.BADGE_VALIDITY_DAYS || 365);
const FRONTEND_URL = String(process.env.FRONTEND_URL || "").trim();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${BASE_URL}/api/auth_google_callback.php`;
const GOOGLE_ALLOWED_DOMAIN = process.env.GOOGLE_ALLOWED_DOMAIN || "";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "100kb" }));
app.use("/images", express.static(path.join(__dirname, "../public/images")));

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const divisionAbbreviationPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getGoogleOAuthConfigError() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.";
  }

  return null;
}

function getRequestOrigin(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || "";

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
}

function buildFrontendLoginUrl(req, params = {}) {
  const frontendBaseUrl = FRONTEND_URL || getRequestOrigin(req) || BASE_URL;
  const url = new URL("/login", frontendBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function exchangeGoogleCode(code) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });

  const tokenResponse = await response.json();
  if (!response.ok) {
    throw new Error(tokenResponse.error_description || tokenResponse.error || "Could not exchange Google authorization code");
  }

  return tokenResponse;
}

async function getGoogleUserInfo(accessToken) {
  if (!accessToken) {
    throw new Error("No se pudo obtener access_token.");
  }

  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  const profile = await response.json();
  if (!response.ok) {
    throw new Error(profile.error_description || profile.error || "Google no respondio correctamente.");
  }

  if (!profile.email || !profile.email_verified) {
    throw new Error("La cuenta de Google no tiene correo verificado.");
  }

  if (GOOGLE_ALLOWED_DOMAIN && profile.hd !== GOOGLE_ALLOWED_DOMAIN) {
    throw new Error(`Google account must belong to ${GOOGLE_ALLOWED_DOMAIN}`);
  }

  return profile;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUserType(type) {
  const normalizedType = String(type || "").trim().toLowerCase();
  if (normalizedType === "super_usuerio") return "super_usuario";
  return normalizedType;
}

function normalizeDivisionAbbreviation(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function requireSuperUserAccess(requesterEmail) {
  const normalizedRequesterEmail = normalizeEmail(requesterEmail);

  if (!normalizedRequesterEmail) {
    return {
      ok: false,
      status: 400,
      error: "requesterEmail is required"
    };
  }

  const requester = await findUserByEmail(normalizedRequesterEmail);
  if (!requester || !requester.enabled || !requester.active) {
    return {
      ok: false,
      status: 403,
      error: "Only active super users can access this module"
    };
  }

  if (!isSuperUserType(requester.type)) {
    return {
      ok: false,
      status: 403,
      error: "Only super users can access this module"
    };
  }

  return {
    ok: true,
    requester
  };
}

async function requireAdminOrSuperAccess(requesterEmail) {
  const normalizedRequesterEmail = normalizeEmail(requesterEmail);

  if (!normalizedRequesterEmail) {
    return {
      ok: false,
      status: 400,
      error: "requesterEmail is required"
    };
  }

  const requester = await findUserByEmail(normalizedRequesterEmail);
  if (!requester || !requester.enabled || !requester.active) {
    return {
      ok: false,
      status: 403,
      error: "Only active users can access this module"
    };
  }

  const normalizedType = String(requester.type || "").toLowerCase();
  if (!isSuperUserType(normalizedType) && normalizedType !== "administrador") {
    return {
      ok: false,
      status: 403,
      error: "Only administrators or super users can approve badges"
    };
  }

  return {
    ok: true,
    requester
  };
}

function validateIssueRequest({ recipientEmail, recipientName, achievementId }) {
  const normalizedEmail = normalizeEmail(recipientEmail);

  if (!normalizedEmail || !recipientName || !achievementId) {
    return "recipientEmail, recipientName and achievementId are required";
  }

  if (!emailPattern.test(normalizedEmail)) {
    return "recipientEmail must be a valid email address";
  }

  if (String(recipientName).trim().length < 2) {
    return "recipientName must contain at least 2 characters";
  }

  return null;
}

function normalizeAchievementPayload(body, id) {
  const achievementId = String(id || body.id || "").trim();
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const criteriaNarrative = String(body.criteriaNarrative || body.criteria?.narrative || "").trim();
  const imageId = String(body.imageId || body.image?.id || `${BASE_URL}/images/node-badge.svg`).trim();
  const revocable = body.revocable === undefined ? true : Boolean(body.revocable);
  const validityPreset = String(body.validityPreset || (body.validUntil ? "custom" : "1y"));
  const validUntil = body.validUntil && validityPreset === "custom" ? new Date(body.validUntil) : null;
  const validityMonthsByPreset = {
    "6m": 6,
    "1y": 12,
    "3y": 36
  };

  if (!achievementId || !name || !description || !criteriaNarrative) {
    return {
      error: "id, name, description and criteriaNarrative are required"
    };
  }

  if (!slugPattern.test(achievementId)) {
    return {
      error: "id must be a lowercase slug, for example curso-node-basico"
    };
  }

  if (!["6m", "1y", "3y", "none", "custom"].includes(validityPreset)) {
    return {
      error: "validityPreset must be one of 6m, 1y, 3y, none or custom"
    };
  }

  if (validityPreset === "custom" && (!validUntil || Number.isNaN(validUntil.getTime()))) {
    return {
      error: "validUntil must be a valid date"
    };
  }

  return {
    id: achievementId,
    achievement: {
      id: `${BASE_URL}/achievements/${achievementId}`,
      type: ["Achievement"],
      name,
      description,
      criteria: {
        narrative: criteriaNarrative
      },
      image: {
        id: imageId,
        type: "Image"
      },
      revocable,
      validityPreset,
      validityMonths: validityMonthsByPreset[validityPreset] || null,
      autoRevocation: validityPreset !== "none",
      validUntil: validUntil ? validUntil.toISOString() : null
    }
  };
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function resolveValidUntil(achievement, issuedAt) {
  if (achievement.validityPreset === "none") return null;
  if (achievement.validityMonths) return addMonths(issuedAt, achievement.validityMonths);
  if (achievement.validUntil) return new Date(achievement.validUntil);
  return addDays(issuedAt, DEFAULT_VALIDITY_DAYS);
}

function getJwtAlgorithm(jwt) {
  try {
    return JSON.parse(Buffer.from(String(jwt).split(".")[0], "base64url").toString("utf-8")).alg;
  } catch {
    return null;
  }
}

async function buildPublicBadgeResponse(badge) {
  let verification;
  const jwt = await getDownloadableBadgeJwt(badge);

  try {
    const payload = await verifyCredentialJwt(jwt);
    verification = verifyIssuedBadge(payload, await listIssuedBadgesFromDb());
  } catch (error) {
    verification = {
      valid: false,
      status: "invalid",
      checks: {
        signature: false
      },
      error: error.message
    };
  }

  return {
    id: badge.id,
    credential: badge.credential,
    status: badge.status,
    revocable: badge.revocable,
    autoRevocation: badge.autoRevocation,
    issuedAt: badge.issuedAt,
    revokedAt: badge.revokedAt,
    revokedReason: badge.status === "revoked" ? badge.revokedReason : null,
    verification,
    jwtUrl: `${BASE_URL}/badges/${badge.id}/jwt`
  };
}

async function getDownloadableBadgeJwt(badge) {
  if (getJwtAlgorithm(badge.jwt) === "RS256") {
    return badge.jwt;
  }

  return await signCredential({
    ...badge.credential,
    issuer: await getPublicIssuerProfile()
  });
}

app.get("/", (req, res) => {
  res.json({
    message: "Open Badges 3.0 Local Issuer",
    endpoints: [
      "GET /issuer",
      "GET /issuer/keys/1",
      "GET /achievements",
      "POST /achievements",
      "GET /achievements/:id",
      "PUT /achievements/:id",
      "DELETE /achievements/:id",
      "POST /badges/issue",
      "GET /badges",
      "GET /badges/:id",
      "GET /badges/:id/jwt",
      "GET /public/badges/:id",
      "POST /badges/:id/revoke",
      "POST /badges/:id/approve",
      "DELETE /badges/:id",
      "POST /badges/verify",
      "GET /db/health",
      "POST /auth/password/login",
      "GET /admin/divisions",
      "POST /admin/divisions",
      "GET /admin/users",
      "POST /admin/users",
      "PUT /admin/users/:id",
      "GET /admin/pending-badges",
      "POST /admin/pending-badges/actions",
      "GET /admin/pending-badges/events",
      "GET /auth/google/start",
      "GET /auth/google/callback",
      "GET /api/auth_google_callback.php",
      "GET /images/node-badge.svg"
    ]
  });
});

app.get("/db/health", async (req, res) => {
  const health = await getDatabaseHealth();
  res.status(health.ok ? 200 : 503).json(health);
});

app.post("/auth/password/login", async (req, res) => {
  try {
    const result = await verifyPasswordLogin(req.body || {});

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json({
      accessGranted: true,
      provider: "password",
      user: result.user,
      requiresFirstLoginSetup: !result.user.firstLoginCompleted
    });
  } catch (error) {
    console.error("Password login failed:", error);
    res.status(500).json({ error: "Could not validate credentials" });
  }
});

app.get("/admin/divisions", async (req, res) => {
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

app.post("/admin/divisions", async (req, res) => {
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

app.get("/admin/users", async (req, res) => {
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

app.post("/admin/users", async (req, res) => {
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

app.put("/admin/users/:id", async (req, res) => {
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

app.get("/admin/pending-badges", async (req, res) => {
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

app.post("/admin/pending-badges/actions", async (req, res) => {
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

app.get("/admin/pending-badges/events", async (req, res) => {
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

app.get("/auth/google/start", (req, res) => {
  const configError = getGoogleOAuthConfigError();
  if (configError) {
    return res.status(503).json({ error: configError });
  }

  const state = String(req.query.state || "").trim();
  if (!state) {
    return res.status(400).json({ error: "state is required" });
  }

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  if (GOOGLE_ALLOWED_DOMAIN) {
    googleAuthUrl.searchParams.set("hd", GOOGLE_ALLOWED_DOMAIN);
  }

  res.redirect(googleAuthUrl.toString());
});

async function handleGoogleCallback(req, res) {
  const configError = getGoogleOAuthConfigError();
  const state = String(req.query.state || "").trim();

  if (configError) {
    return res.redirect(buildFrontendLoginUrl(req, { googleAuth: "error", reason: configError, state }));
  }

  if (req.query.error) {
    return res.redirect(buildFrontendLoginUrl(req, { googleAuth: "error", reason: String(req.query.error), state }));
  }

  const code = String(req.query.code || "").trim();
  if (!code) {
    return res.redirect(buildFrontendLoginUrl(req, { googleAuth: "error", reason: "Missing Google authorization code", state }));
  }

  try {
    const tokenResponse = await exchangeGoogleCode(code);
    const profile = await getGoogleUserInfo(tokenResponse.access_token);

    res.redirect(buildFrontendLoginUrl(req, {
      googleAuth: "success",
      state,
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture || ""
    }));
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    res.redirect(buildFrontendLoginUrl(req, { googleAuth: "error", reason: error.message, state }));
  }
}

app.get("/auth/google/callback", handleGoogleCallback);
app.get("/api/auth_google_callback.php", handleGoogleCallback);

async function getPublicIssuerProfile() {
  const publicJwk = await getPublicJwk();

  return {
    ...issuer,
    publicKey: [
      {
        id: getKeyId(),
        type: "JsonWebKey2020",
        controller: issuer.id,
        publicKeyJwk: publicJwk
      }
    ],
    verificationMethod: [
      {
        id: getKeyId(),
        type: "JsonWebKey2020",
        controller: issuer.id,
        publicKeyJwk: publicJwk
      }
    ],
    assertionMethod: [getKeyId()]
  };
}

app.get("/issuer", async (req, res) => {
  res.json(await getPublicIssuerProfile());
});

app.get("/issuer/keys/1", async (req, res) => {
  res.json(await getPublicJwk());
});

app.get("/achievements", async (req, res) => {
  try {
    res.json(await listAchievementsFromDb());
  } catch (error) {
    console.error("Could not list achievements:", error);
    res.status(500).json({ error: "Could not list achievements" });
  }
});

app.post("/achievements", async (req, res) => {
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

app.get("/achievements/:id", async (req, res) => {
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

app.put("/achievements/:id", async (req, res) => {
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

app.delete("/achievements/:id", async (req, res) => {
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

app.post("/badges/issue", async (req, res) => {
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
    id: `${BASE_URL}/badges/${badgeId}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: credentialIssuer,
    validFrom: issuedAt.toISOString(),
    credentialStatus: {
      id: `${BASE_URL}/badges/${badgeId}`,
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

app.get("/badges", async (req, res) => {
  try {
    res.json(await listIssuedBadgesFromDb());
  } catch (error) {
    console.error("Could not load badges:", error);
    res.status(500).json({ error: "Could not load badges" });
  }
});

app.get("/public/badges/:id", async (req, res) => {
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

app.get("/badges/:id", async (req, res) => {
  const badge = await findIssuedBadgeFromDb(req.params.id);

  if (!badge) {
    return res.status(404).json({ error: "Badge not found" });
  }

  res.json(badge);
});

app.get("/badges/:id/jwt", async (req, res) => {
  const badge = await findIssuedBadgeFromDb(req.params.id);

  if (!badge) {
    return res.status(404).json({ error: "Badge not found" });
  }

  if (badge.status === "pending_review") {
    return res.status(409).json({ error: "Badge is pending approval" });
  }

  res.type("text/plain").send(await getDownloadableBadgeJwt(badge));
});

app.post("/badges/:id/revoke", async (req, res) => {
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

app.post("/badges/:id/approve", async (req, res) => {
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

app.delete("/badges/:id", async (req, res) => {
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

app.post("/badges/verify", async (req, res) => {
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
      console.log(`Open Badges local server running on ${BASE_URL}`);
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
