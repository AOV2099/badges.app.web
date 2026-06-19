import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classes) {
  return twMerge(clsx(classes));
}

export function flyAndScale(node, params = {}) {
  const {
    y = -8,
    x = 0,
    start = 0.96,
    duration = 150
  } = params;
  const style = getComputedStyle(node);
  const transform = style.transform === "none" ? "" : style.transform;

  return {
    duration,
    css: (t) => {
      const scale = start + (1 - start) * t;
      return `
        transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px) scale(${scale});
        opacity: ${t};
      `;
    }
  };
}

export function getSlugFromUrl(url) {
  return String(url || "").split("/").filter(Boolean).pop() || "";
}

export function toDisplayUppercase(value) {
  return String(value || "").toLocaleUpperCase("es-MX");
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildAchievementId(courseName, career = "ICO", date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return [slugify(courseName), slugify(career), `${year}${month}`].filter(Boolean).join("-");
}

export function formatDate(value) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatStatus(value) {
  const labels = {
    active: "Activa",
    revoked: "Revocada",
    pending_review: "En revisión",
    pending: "Pendiente",
    preview: "Vista previa",
    issued: "Emitida",
    rejected_batch: "Rechazadas"
  };

  return labels[value] || value || "Sin estado";
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
    name: achievement.name || "Insignia verificable",
    organizationName: issuer.name || "Emisor de insignias",
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
