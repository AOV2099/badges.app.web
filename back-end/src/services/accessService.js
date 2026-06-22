import { findUserByEmail, isSuperUserType } from "../db.js";
import { normalizeEmail } from "./normalizers.js";

export async function requireSuperUserAccess(requesterEmail) {
  const normalizedRequesterEmail = normalizeEmail(requesterEmail);

  if (!normalizedRequesterEmail) {
    return {
      ok: false,
      status: 400,
      error: "requesterEmail is required"
    };
  }

  const requester = await findUserByEmail(normalizedRequesterEmail);
  if (!requester || !requester.enabled || !requester.active) {
    return {
      ok: false,
      status: 403,
      error: "Only active super users can access this module"
    };
  }

  if (!isSuperUserType(requester.type)) {
    return {
      ok: false,
      status: 403,
      error: "Only super users can access this module"
    };
  }

  return {
    ok: true,
    requester
  };
}

export async function requireAdminOrSuperAccess(requesterEmail) {
  const normalizedRequesterEmail = normalizeEmail(requesterEmail);

  if (!normalizedRequesterEmail) {
    return {
      ok: false,
      status: 400,
      error: "requesterEmail is required"
    };
  }

  const requester = await findUserByEmail(normalizedRequesterEmail);
  if (!requester || !requester.enabled || !requester.active) {
    return {
      ok: false,
      status: 403,
      error: "Only active users can access this module"
    };
  }

  const normalizedType = String(requester.type || "").toLowerCase();
  if (!isSuperUserType(normalizedType) && normalizedType !== "administrador") {
    return {
      ok: false,
      status: 403,
      error: "Only administrators or super users can approve badges"
    };
  }

  return {
    ok: true,
    requester
  };
}
