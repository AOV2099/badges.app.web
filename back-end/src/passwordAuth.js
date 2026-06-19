import bcrypt from "bcryptjs";
import { findLocalUserForPasswordLogin, isDatabaseConfigured, markUserLogin } from "./db.js";

export function normalizeLoginEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    type: row.type,
    picture: row.picture_url || "",
    divisionId: row.division_id,
    provider: row.provider,
    firstLoginCompleted: row.first_login_completed,
    enabled: row.enabled,
    active: row.active,
    lastLoginAt: row.last_login_at
  };
}

export async function verifyPasswordLogin({ email, password }) {
  if (!isDatabaseConfigured) {
    return {
      ok: false,
      status: 503,
      error: "Database is not configured. Set DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD."
    };
  }

  const normalizedEmail = normalizeLoginEmail(email);
  const rawPassword = String(password || "");

  if (!normalizedEmail || !rawPassword) {
    return {
      ok: false,
      status: 400,
      error: "email and password are required"
    };
  }

  const user = await findLocalUserForPasswordLogin(normalizedEmail);
  if (!user?.password_hash) {
    return {
      ok: false,
      status: 401,
      error: "Invalid email or password"
    };
  }

  const passwordMatches = await bcrypt.compare(rawPassword, user.password_hash);
  if (!passwordMatches) {
    return {
      ok: false,
      status: 401,
      error: "Invalid email or password"
    };
  }

  const lastLoginAt = await markUserLogin(user.id);

  return {
    ok: true,
    user: toPublicUser({
      ...user,
      last_login_at: lastLoginAt
    })
  };
}