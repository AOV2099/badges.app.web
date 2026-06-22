import { PUBLIC_API_ORIGIN } from "../config.js";
import { slugPattern } from "./normalizers.js";

export function normalizeAchievementPayload(body, id) {
  const achievementId = String(id || body.id || "").trim();
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const criteriaNarrative = String(body.criteriaNarrative || body.criteria?.narrative || "").trim();
  const imageId = String(body.imageId || body.image?.id || `${PUBLIC_API_ORIGIN}/api/images/node-badge.svg`).trim();
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
      id: `${PUBLIC_API_ORIGIN}/api/achievements/${achievementId}`,
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
