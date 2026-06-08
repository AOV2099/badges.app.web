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
