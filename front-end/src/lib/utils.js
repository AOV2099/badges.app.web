export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function getSlugFromUrl(url) {
  return String(url || "").split("/").filter(Boolean).pop() || "";
}

export function formatDate(value) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function truncate(value, size = 12) {
  const text = String(value || "");
  if (text.length <= size) return text;
  return `${text.slice(0, size)}…`;
}

export function getPublicBadgeUrl(badge, origin = globalThis.window?.location?.origin || "") {
  if (!badge?.id || !origin) return "";
  return `${origin.replace(/\/$/, "")}/badge/${encodeURIComponent(badge.id)}`;
}

export function buildLinkedInCertificationUrl(badge, credentialUrl = getPublicBadgeUrl(badge)) {
  const credential = badge?.credential || {};
  const subject = credential.credentialSubject || {};
  const achievement = subject.achievement || {};
  const issuer = credential.issuer || {};
  const issuedAt = credential.validFrom || badge?.issuedAt;
  const expirationDate = credential.validUntil ? new Date(credential.validUntil) : null;
  const issueDate = issuedAt ? new Date(issuedAt) : new Date();
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: achievement.name || "Open Badge",
    organizationName: issuer.name || "Open Badges Issuer",
    issueYear: String(issueDate.getFullYear()),
    issueMonth: String(issueDate.getMonth() + 1),
    certId: badge?.id || "",
    certUrl: credentialUrl || ""
  });

  if (expirationDate && !Number.isNaN(expirationDate.getTime())) {
    params.set("expirationYear", String(expirationDate.getFullYear()));
    params.set("expirationMonth", String(expirationDate.getMonth() + 1));
  }

  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
