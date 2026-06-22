export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const divisionAbbreviationPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeUserType(type) {
  const normalizedType = String(type || "").trim().toLowerCase();
  if (normalizedType === "super_usuerio") return "super_usuario";
  return normalizedType;
}

export function normalizeDivisionAbbreviation(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
