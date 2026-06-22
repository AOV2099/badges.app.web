export const PORT = Number(process.env.PORT || 3001);
export const LOCAL_API_ORIGIN = `http://localhost:${PORT}`;
export const DEFAULT_VALIDITY_DAYS = Number(process.env.BADGE_VALIDITY_DAYS || 365);
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${LOCAL_API_ORIGIN}/api/auth_google_callback.php`;
export const GOOGLE_ALLOWED_DOMAIN = process.env.GOOGLE_ALLOWED_DOMAIN || "";
export const PUBLIC_API_ORIGIN = getUrlOrigin(GOOGLE_REDIRECT_URI) || LOCAL_API_ORIGIN;

export function getUrlOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
