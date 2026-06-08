import { issuer } from "./issuer.js";

export function verifyIssuedBadge(payload, issuedBadges) {
  const credential = payload?.vc;
  const credentialId = credential?.id;
  const issuedBadge = issuedBadges.find((badge) => badge.credential?.id === credentialId);
  const now = new Date();
  const validUntil = credential?.validUntil ? new Date(credential.validUntil) : null;
  const issuerId = credential?.issuer?.id;
  const checks = {
    signature: true,
    issuedRecordExists: Boolean(issuedBadge),
    issuer: issuerId === issuer.id,
    notExpired: validUntil ? validUntil > now : true,
    notRevoked: issuedBadge ? issuedBadge.status !== "revoked" : false
  };

  return {
    valid: Object.values(checks).every(Boolean),
    status: issuedBadge?.status || "unknown",
    checks
  };
}
