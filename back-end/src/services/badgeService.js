import { DEFAULT_VALIDITY_DAYS, PUBLIC_API_ORIGIN } from "../config.js";
import { listIssuedBadgesFromDb } from "../db.js";
import { signCredential, verifyCredentialJwt } from "../signer.js";
import { verifyIssuedBadge } from "../verifier.js";
import { getPublicIssuerProfile } from "./issuerService.js";
import { emailPattern, normalizeEmail } from "./normalizers.js";

export function validateIssueRequest({ recipientEmail, recipientName, achievementId }) {
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

export function resolveValidUntil(achievement, issuedAt) {
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

export async function getDownloadableBadgeJwt(badge) {
  if (getJwtAlgorithm(badge.jwt) === "RS256") {
    return badge.jwt;
  }

  return await signCredential({
    ...badge.credential,
    issuer: await getPublicIssuerProfile()
  });
}

export async function buildPublicBadgeResponse(badge) {
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
    jwtUrl: `${PUBLIC_API_ORIGIN}/api/badges/${badge.id}/jwt`
  };
}
