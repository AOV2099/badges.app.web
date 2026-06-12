import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { issuer } from "./issuer.js";
import { achievements } from "./badges.js";
import { signCredential, verifyCredentialJwt } from "./signer.js";
import { verifyIssuedBadge } from "./verifier.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const DEFAULT_VALIDITY_DAYS = Number(process.env.BADGE_VALIDITY_DAYS || 365);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "100kb" }));
app.use("/images", express.static(path.join(__dirname, "../public/images")));

const dataPath = process.env.BADGES_DATA_PATH || path.join(__dirname, "../data/issued-badges.json");
const achievementsDataPath = process.env.ACHIEVEMENTS_DATA_PATH || path.join(__dirname, "../data/achievements.json");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readIssuedBadges() {
  try {
    if (!fs.existsSync(dataPath)) return [];
    return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  } catch (error) {
    console.error("Could not read issued badges data:", error);
    return [];
  }
}

function saveIssuedBadges(badges) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(badges, null, 2));
}

function readAchievements() {
  try {
    if (!fs.existsSync(achievementsDataPath)) return achievements;
    return JSON.parse(fs.readFileSync(achievementsDataPath, "utf-8"));
  } catch (error) {
    console.error("Could not read achievements data:", error);
    return achievements;
  }
}

function saveAchievements(achievementMap) {
  fs.mkdirSync(path.dirname(achievementsDataPath), { recursive: true });
  fs.writeFileSync(achievementsDataPath, JSON.stringify(achievementMap, null, 2));
}

function getBadgeById(id) {
  return readIssuedBadges().find((item) => item.id === id);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateIssueRequest({ recipientEmail, recipientName, achievementId }) {
  const normalizedEmail = normalizeEmail(recipientEmail);
  const achievementMap = readAchievements();

  if (!normalizedEmail || !recipientName || !achievementId) {
    return "recipientEmail, recipientName and achievementId are required";
  }

  if (!emailPattern.test(normalizedEmail)) {
    return "recipientEmail must be a valid email address";
  }

  if (String(recipientName).trim().length < 2) {
    return "recipientName must contain at least 2 characters";
  }

  if (!achievementMap[achievementId]) {
    return "Achievement not found";
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

async function buildPublicBadgeResponse(badge) {
  let verification;

  try {
    const payload = await verifyCredentialJwt(badge.jwt);
    verification = verifyIssuedBadge(payload, readIssuedBadges());
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

app.get("/", (req, res) => {
  res.json({
    message: "Open Badges 3.0 Local Issuer",
    endpoints: [
      "GET /issuer",
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
      "DELETE /badges/:id",
      "POST /badges/verify",
      "GET /images/node-badge.svg"
    ]
  });
});

app.get("/issuer", (req, res) => {
  res.json(issuer);
});

app.get("/achievements", (req, res) => {
  res.json(Object.values(readAchievements()));
});

app.post("/achievements", (req, res) => {
  const achievementMap = readAchievements();
  const result = normalizeAchievementPayload(req.body);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  if (achievementMap[result.id]) {
    return res.status(409).json({ error: "Achievement already exists" });
  }

  achievementMap[result.id] = result.achievement;
  saveAchievements(achievementMap);

  res.status(201).json(result.achievement);
});

app.get("/achievements/:id", (req, res) => {
  const achievement = readAchievements()[req.params.id];

  if (!achievement) {
    return res.status(404).json({ error: "Achievement not found" });
  }

  res.json(achievement);
});

app.put("/achievements/:id", (req, res) => {
  const achievementMap = readAchievements();

  if (!achievementMap[req.params.id]) {
    return res.status(404).json({ error: "Achievement not found" });
  }

  const hasIssuedBadges = readIssuedBadges().some(
    (badge) => badge.credential?.credentialSubject?.achievement?.id === achievementMap[req.params.id].id
  );

  if (hasIssuedBadges) {
    return res.status(409).json({
      error: "Achievement has issued badges and cannot be edited"
    });
  }

  const result = normalizeAchievementPayload(req.body, req.params.id);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  achievementMap[req.params.id] = result.achievement;
  saveAchievements(achievementMap);

  res.json(result.achievement);
});

app.delete("/achievements/:id", (req, res) => {
  const achievementMap = readAchievements();

  if (!achievementMap[req.params.id]) {
    return res.status(404).json({ error: "Achievement not found" });
  }

  const hasIssuedBadges = readIssuedBadges().some(
    (badge) => badge.credential?.credentialSubject?.achievement?.id === achievementMap[req.params.id].id
  );

  if (hasIssuedBadges) {
    return res.status(409).json({
      error: "Achievement has issued badges and cannot be deleted"
    });
  }

  delete achievementMap[req.params.id];
  saveAchievements(achievementMap);

  res.status(204).send();
});

app.post("/badges/issue", async (req, res) => {
  const { recipientEmail, recipientName, achievementId } = req.body;
  const validationError = validateIssueRequest(req.body);

  if (validationError) {
    const status = validationError === "Achievement not found" ? 404 : 400;
    return res.status(status).json({
      error: validationError
    });
  }

  const achievement = readAchievements()[achievementId];
  const badgeId = uuidv4();
  const issuedAt = new Date();
  const validUntil = resolveValidUntil(achievement, issuedAt);
  const revocable = achievement.revocable !== false;
  const autoRevocation = achievement.validityPreset !== "none";

  const credential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
    ],
    id: `${BASE_URL}/badges/${badgeId}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer,
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

  const issuedBadge = {
    id: badgeId,
    credential,
    jwt,
    status: "active",
    revocable,
    autoRevocation,
    issuedAt: issuedAt.toISOString(),
    revokedAt: null,
    revokedReason: null
  };

  try {
    const badges = readIssuedBadges();
    badges.push(issuedBadge);
    saveIssuedBadges(badges);
  } catch (error) {
    return res.status(500).json({ error: "Could not save issued badge" });
  }

  res.status(201).json(issuedBadge);
});

app.get("/badges", (req, res) => {
  res.json(readIssuedBadges());
});

app.get("/public/badges/:id", async (req, res) => {
  const badge = getBadgeById(req.params.id);

  if (!badge) {
    return res.status(404).json({ error: "Badge not found" });
  }

  res.set("Cache-Control", "no-store");
  res.json(await buildPublicBadgeResponse(badge));
});

app.get("/badges/:id", (req, res) => {
  const badge = getBadgeById(req.params.id);

  if (!badge) {
    return res.status(404).json({ error: "Badge not found" });
  }

  res.json(badge);
});

app.get("/badges/:id/jwt", (req, res) => {
  const badge = getBadgeById(req.params.id);

  if (!badge) {
    return res.status(404).json({ error: "Badge not found" });
  }

  res.type("text/plain").send(badge.jwt);
});

app.post("/badges/:id/revoke", (req, res) => {
  const badges = readIssuedBadges();
  const badgeIndex = badges.findIndex((item) => item.id === req.params.id);

  if (badgeIndex === -1) {
    return res.status(404).json({ error: "Badge not found" });
  }

  const badge = badges[badgeIndex];

  if (badge.status === "revoked") {
    return res.status(409).json({ error: "Badge is already revoked" });
  }

  if (badge.revocable === false || badge.credential?.credentialStatus?.revocable === false) {
    return res.status(403).json({ error: "Badge is not revocable" });
  }

  const revokedAt = new Date().toISOString();
  const revokedReason = String(req.body?.reason || "No reason provided").trim();

  badges[badgeIndex] = {
    ...badge,
    status: "revoked",
    revokedAt,
    revokedReason,
    credential: {
      ...badge.credential,
      credentialStatus: {
        ...badge.credential.credentialStatus,
        status: "revoked",
        revokedAt,
        revokedReason
      }
    }
  };

  saveIssuedBadges(badges);

  res.json(badges[badgeIndex]);
});

app.delete("/badges/:id", (req, res) => {
  const badges = readIssuedBadges();
  const nextBadges = badges.filter((item) => item.id !== req.params.id);

  if (nextBadges.length === badges.length) {
    return res.status(404).json({ error: "Badge not found" });
  }

  saveIssuedBadges(nextBadges);

  res.status(204).send();
});

app.post("/badges/verify", async (req, res) => {
  const { jwt } = req.body;

  if (!jwt) {
    return res.status(400).json({ error: "jwt is required" });
  }

  try {
    const payload = await verifyCredentialJwt(jwt);
    const result = verifyIssuedBadge(payload, readIssuedBadges());

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

app.listen(PORT, () => {
  console.log(`Open Badges local server running on ${BASE_URL}`);
});
