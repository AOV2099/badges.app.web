import {
  GOOGLE_ALLOWED_DOMAIN,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
} from "../config.js";

export function getGoogleOAuthConfigError() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.";
  }

  return null;
}

function getFrontendOriginFromState(state) {
  try {
    const parsedState = JSON.parse(Buffer.from(String(state || ""), "base64").toString("utf-8"));
    const returnTo = new URL(parsedState.returnTo);

    if (!["http:", "https:"].includes(returnTo.protocol)) {
      return null;
    }

    return returnTo.origin;
  } catch {
    return null;
  }
}

export function buildFrontendLoginUrl(req, params = {}) {
  const frontendBaseUrl = getFrontendOriginFromState(params.state);
  const url = frontendBaseUrl ? new URL("/login", frontendBaseUrl) : new URL("/login", GOOGLE_REDIRECT_URI);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export async function exchangeGoogleCode(code) {
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

export async function getGoogleUserInfo(accessToken) {
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
