import bcrypt from "bcryptjs";
import swaggerUi from "swagger-ui-express";
import { GOOGLE_ALLOWED_DOMAIN, GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, PUBLIC_API_ORIGIN } from "../config.js";
import { openApiDocument } from "../openapi.js";
import { verifyPasswordLogin } from "../passwordAuth.js";
import { getPublicJwk, signCredential, verifyCredentialJwt } from "../signer.js";
import { verifyIssuedBadge } from "../verifier.js";
import {
  approveIssuedBadgeInDb,
  achievementHasIssuedBadges,
  createAchievementInDb,
  createDivision,
  createIssuedBadgeInDb,
  createPendingBadgeReviewEventInDb,
  createManagedUser,
  deleteAchievementFromDb,
  deleteIssuedBadgeFromDb,
  findAchievementFromDb,
  findIssuedBadgeFromDb,
  findUserByEmail,
  getDatabaseHealth,
  isSuperUserType,
  listAchievementsFromDb,
  listDivisions,
  listIssuedBadgesFromDb,
  listPendingBadgeReviewEventsForReviewer,
  listPendingIssuedBadgesForReviewer,
  listManageableUsers,
  revokeIssuedBadgeInDb,
  updateAchievementInDb,
  updateManagedUser
} from "../db.js";
import { requireAdminOrSuperAccess, requireSuperUserAccess } from "../services/accessService.js";
import { normalizeAchievementPayload } from "../services/achievementService.js";
import {
  buildPublicBadgeResponse,
  getDownloadableBadgeJwt,
  resolveValidUntil,
  validateIssueRequest
} from "../services/badgeService.js";
import { getPublicIssuerProfile } from "../services/issuerService.js";
import {
  divisionAbbreviationPattern,
  emailPattern,
  normalizeDivisionAbbreviation,
  normalizeEmail,
  normalizeUserType
} from "../services/normalizers.js";
import {
  buildFrontendLoginUrl,
  exchangeGoogleCode,
  getGoogleOAuthConfigError,
  getGoogleUserInfo
} from "../services/oauthService.js";
import { registerAchievementRoutes } from "./achievementRoutes.js";
import { registerAdminRoutes } from "./adminRoutes.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerBadgeRoutes } from "./badgeRoutes.js";
import { registerHealthRoutes } from "./healthRoutes.js";
import { registerIssuerRoutes } from "./issuerRoutes.js";

export function registerAppRoutes(app) {
  app.get("/api/openapi.json", (req, res) => {
    res.json(openApiDocument);
  });

  app.get("/api", (req, res) => {
    res.redirect("/api/docs");
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  registerHealthRoutes(app, {
    getDatabaseHealth
  });

  registerAuthRoutes(app, {
    verifyPasswordLogin,
    getGoogleOAuthConfigError,
    GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI,
    GOOGLE_ALLOWED_DOMAIN,
    exchangeGoogleCode,
    getGoogleUserInfo,
    buildFrontendLoginUrl
  });

  registerIssuerRoutes(app, {
    getPublicIssuerProfile,
    getPublicJwk
  });

  registerAchievementRoutes(app, {
    listAchievementsFromDb,
    normalizeAchievementPayload,
    findAchievementFromDb,
    createAchievementInDb,
    updateAchievementInDb,
    deleteAchievementFromDb,
    achievementHasIssuedBadges,
    getPublicIssuerProfile
  });

  registerBadgeRoutes(app, {
    validateIssueRequest,
    resolveValidUntil,
    normalizeEmail,
    isSuperUserType,
    findAchievementFromDb,
    createIssuedBadgeInDb,
    listIssuedBadgesFromDb,
    findIssuedBadgeFromDb,
    revokeIssuedBadgeInDb,
    approveIssuedBadgeInDb,
    deleteIssuedBadgeFromDb,
    verifyCredentialJwt,
    verifyIssuedBadge,
    signCredential,
    getPublicIssuerProfile,
    getDownloadableBadgeJwt,
    buildPublicBadgeResponse,
    findUserByEmail,
    requireAdminOrSuperAccess,
    PUBLIC_API_ORIGIN
  });

  registerAdminRoutes(app, {
    requireSuperUserAccess,
    requireAdminOrSuperAccess,
    normalizeDivisionAbbreviation,
    normalizeUserType,
    normalizeEmail,
    divisionAbbreviationPattern,
    emailPattern,
    isSuperUserType,
    listDivisions,
    createDivision,
    listManageableUsers,
    createManagedUser,
    updateManagedUser,
    listPendingIssuedBadgesForReviewer,
    findIssuedBadgeFromDb,
    approveIssuedBadgeInDb,
    deleteIssuedBadgeFromDb,
    createPendingBadgeReviewEventInDb,
    listPendingBadgeReviewEventsForReviewer,
    bcrypt
  });
}
