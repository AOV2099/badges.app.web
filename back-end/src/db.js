import pg from "pg";

const { Pool } = pg;

const databaseRequired = process.env.DB_REQUIRED !== "false";
const databaseConnectRetries = Number(process.env.DB_CONNECT_RETRIES || 10);
const databaseRetryDelayMs = Number(process.env.DB_RETRY_DELAY_MS || 1000);
const databaseRetryMaxDelayMs = Number(process.env.DB_RETRY_MAX_DELAY_MS || 10000);

export const databaseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "open_badges",
  user: process.env.DB_USER || "afc",
  password: process.env.DB_PASSWORD || "admin"
};

export const isDatabaseConfigured = Boolean(
  databaseConfig.host && databaseConfig.database && databaseConfig.user && databaseConfig.password
  
);

export const pool = new Pool({
  ...databaseConfig,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000)
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryDelay(attempt) {
  return Math.min(databaseRetryDelayMs * 2 ** Math.max(attempt - 1, 0), databaseRetryMaxDelayMs);
}

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withDbClient(callback) {
  const client = await pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection() {
  const result = await query("SELECT current_database() AS database, current_setting('server_version') AS version");
  return result.rows[0];
}

export async function getDatabaseHealth() {
  if (!isDatabaseConfigured) {
    return {
      ok: false,
      configured: false,
      error: "Database is not configured. Set DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD."
    };
  }

  try {
    const database = await checkDatabaseConnection();

    return {
      ok: true,
      configured: true,
      database
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error.message
    };
  }
}

export async function findLocalUserForPasswordLogin(email) {
  const result = await query(
    `SELECT id,
            name,
            email,
            type,
            picture_url,
            division_id,
            provider,
            first_login_completed,
            enabled,
            active,
            last_login_at,
            password_hash
       FROM users
      WHERE email = $1
        AND provider = 'local'
        AND enabled = true
        AND active = true
      LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
}

export async function markUserLogin(userId) {
  const result = await query(
    `UPDATE users
        SET last_login_at = now()
      WHERE id = $1
      RETURNING last_login_at`,
    [userId]
  );

  return result.rows[0]?.last_login_at || null;
}

export function isSuperUserType(type) {
  const normalized = String(type || "").toLowerCase();
  return normalized === "super_usuario" || normalized === "super_usuerio";
}

export async function findUserByEmail(email) {
  const result = await query(
    `SELECT id,
            name,
            email,
            type,
            picture_url,
            division_id,
            provider,
            first_login_completed,
            enabled,
            active,
            last_login_at
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
}

export async function listDivisions() {
  const result = await query(
    `SELECT id, name
       FROM divisions
      ORDER BY name ASC`
  );

  return result.rows;
}

export async function createDivision({ id, name }) {
  const result = await query(
    `INSERT INTO divisions (id, name)
      VALUES ($1, $2)
      RETURNING id, name, updated_at`,
    [id, name]
  );

  return result.rows[0];
}

export async function listManageableUsers({ search = "", excludeEmail = "", divisionId = "" } = {}) {
  const normalizedSearch = `%${String(search || "").trim().toLowerCase()}%`;
  const normalizedExcludeEmail = String(excludeEmail || "").trim().toLowerCase();
  const normalizedDivisionId = String(divisionId || "").trim().toLowerCase();

  const result = await query(
    `SELECT u.id,
            u.name,
            u.email,
            u.type,
            u.division_id,
            d.name AS division_name,
            u.enabled,
            u.active,
            u.provider,
            u.last_login_at,
            u.updated_at
       FROM users u
       JOIN divisions d ON d.id = u.division_id
      WHERE lower(u.type::text) NOT IN ('super_usuario', 'super_usuerio')
        AND ($1 = '' OR lower(u.email::text) <> $1)
        AND ($2 = '' OR lower(u.division_id::text) = $2)
        AND (
          $3 = '%%'
          OR lower(u.name) LIKE $3
          OR lower(u.email::text) LIKE $3
          OR lower(d.name) LIKE $3
          OR lower(u.type::text) LIKE $3
        )
      ORDER BY u.updated_at DESC, u.name ASC`,
    [normalizedExcludeEmail, normalizedDivisionId, normalizedSearch]
  );

  return result.rows;
}

export async function createManagedUser({
  name,
  email,
  type,
  divisionId,
  enabled,
  provider,
  passwordHash = null,
  providerSubject = null
}) {
  const result = await query(
    `INSERT INTO users (
        name,
        email,
        type,
        division_id,
        provider,
        provider_subject,
        password_hash,
        password_updated_at,
        enabled,
        active
      )
      VALUES (
        $1,
        $2,
        $3::user_type,
        $4,
        $5,
        $6,
        $7,
        CASE WHEN $7::text IS NULL THEN NULL ELSE now() END,
        $8,
        true
      )
      RETURNING id,
                name,
                email,
                type,
                division_id,
                enabled,
                active,
                provider,
                updated_at`,
    [name, email, type, divisionId, provider, providerSubject, passwordHash, enabled]
  );

  return result.rows[0];
}

export async function updateManagedUser({ id, name, email, type, divisionId, enabled }) {
  const result = await query(
    `UPDATE users
        SET name = $2,
            email = $3,
            type = $4::user_type,
            division_id = $5,
            enabled = $6,
            updated_at = now()
      WHERE id = $1
      RETURNING id,
                name,
                email,
                type,
                division_id,
                enabled,
                active,
                provider,
                updated_at`,
    [id, name, email, type, divisionId, enabled]
  );

  return result.rows[0] || null;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function mapIssuedBadgeRow(row) {
  if (!row) return null;

  const approved = row.approved === true;
  const normalizedStatus = !approved && row.status === "active" ? "pending_review" : row.status;

  return {
    id: row.id,
    credential: row.credential,
    jwt: row.jwt,
    status: normalizedStatus,
    revocable: row.revocable,
    autoRevocation: row.auto_revocation,
    divisionId: row.division_id || null,
    approved,
    approvedAt: toIsoOrNull(row.approved_at),
    approvedByUserId: row.approved_by_user_id || null,
    requesterEmail: row.requester_email || null,
    requesterName: row.requester_name || null,
    issuedAt: toIsoOrNull(row.issued_at),
    revokedAt: toIsoOrNull(row.revoked_at),
    revokedReason: row.revoked_reason || null
  };
}

export async function listPendingIssuedBadgesForReviewer({ reviewerType = "", reviewerDivisionId = "", search = "" } = {}) {
  const normalizedType = String(reviewerType || "").trim().toLowerCase();
  const normalizedDivisionId = String(reviewerDivisionId || "").trim().toLowerCase();
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const searchPattern = `%${normalizedSearch}%`;

  const isDivisionScopedReviewer = normalizedType === "administrador";

  const result = await query(
    `SELECT ib.id,
            ib.credential,
            ib.jwt,
            ib.status,
            ib.revocable,
            ib.auto_revocation,
            ib.division_id,
            ib.approved,
            ib.approved_at,
            ib.approved_by_user_id,
            ib.issued_at,
            ib.revoked_at,
            ib.revoked_reason,
            creator.email AS requester_email,
            creator.name AS requester_name
       FROM issued_badges ib
       JOIN users creator ON creator.id = ib.created_by_user_id
      WHERE ib.status = 'pending_review'
        AND (
          NOT $1::boolean
          OR ib.division_id = $2
        )
        AND (
          $3 = ''
          OR lower(ib.id::text) LIKE $4
          OR lower(ib.achievement_id::text) LIKE $4
          OR lower(ib.recipient_email::text) LIKE $4
          OR lower(ib.recipient_name) LIKE $4
          OR lower(creator.email::text) LIKE $4
          OR lower(creator.name) LIKE $4
        )
      ORDER BY ib.issued_at DESC, ib.created_at DESC`,
    [isDivisionScopedReviewer, normalizedDivisionId, normalizedSearch, searchPattern]
  );

  return result.rows.map(mapIssuedBadgeRow);
}

export async function createPendingBadgeReviewEventInDb({
  reviewerUserId,
  reviewerEmail,
  reviewerType,
  reviewerDivisionId,
  action,
  processed = [],
  skipped = []
} = {}) {
  const normalizedAction = String(action || "").trim().toLowerCase();
  const normalizedReviewerEmail = String(reviewerEmail || "").trim().toLowerCase();
  const normalizedReviewerType = String(reviewerType || "").trim().toLowerCase();
  const normalizedReviewerDivisionId = String(reviewerDivisionId || "").trim().toLowerCase() || null;
  const normalizedProcessed = Array.isArray(processed) ? processed : [];
  const normalizedSkipped = Array.isArray(skipped) ? skipped : [];

  if (!reviewerUserId || !normalizedReviewerEmail || !normalizedAction) {
    return null;
  }

  const badgeIds = normalizedProcessed
    .map((item) => String(item?.id || "").trim())
    .filter(Boolean);

  const result = await query(
    `INSERT INTO audit_events (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb
      )
      RETURNING id,
                actor_user_id,
                action,
                entity_type,
                entity_id,
                metadata,
                created_at`,
    [
      reviewerUserId,
      normalizedAction === "approve" ? "pending_badges_approved" : "pending_badges_denied",
      "pending_badges_review",
      normalizedAction,
      `pending-review-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      JSON.stringify({
        reviewerEmail: normalizedReviewerEmail,
        reviewerType: normalizedReviewerType,
        reviewerDivisionId: normalizedReviewerDivisionId,
        processedCount: normalizedProcessed.length,
        skippedCount: normalizedSkipped.length,
        badgeIds,
        processed: normalizedProcessed,
        skipped: normalizedSkipped
      })
    ]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    reviewer_user_id: row.actor_user_id,
    reviewer_email: row.metadata?.reviewerEmail || normalizedReviewerEmail,
    reviewer_type: row.metadata?.reviewerType || normalizedReviewerType,
    reviewer_division_id: row.metadata?.reviewerDivisionId || normalizedReviewerDivisionId,
    action: normalizedAction,
    processed_count: Number(row.metadata?.processedCount || normalizedProcessed.length || 0),
    skipped_count: Number(row.metadata?.skippedCount || normalizedSkipped.length || 0),
    badge_ids: row.metadata?.badgeIds || badgeIds,
    details: {
      processed: row.metadata?.processed || normalizedProcessed,
      skipped: row.metadata?.skipped || normalizedSkipped
    },
    created_at: row.created_at
  };
}

export async function listPendingBadgeReviewEventsForReviewer({ reviewerType = "", reviewerDivisionId = "", limit = 100 } = {}) {
  const normalizedType = String(reviewerType || "").trim().toLowerCase();
  const normalizedDivisionId = String(reviewerDivisionId || "").trim().toLowerCase();
  const isDivisionScopedReviewer = normalizedType === "administrador";
  const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(500, Number(limit))) : 100;

  const result = await query(
    `SELECT id,
            actor_user_id,
            action,
            metadata,
            created_at
       FROM audit_events
      WHERE entity_type = 'pending_badges_review'
        AND action IN ('pending_badges_approved', 'pending_badges_denied')
        AND (
          NOT $1::boolean
          OR lower(coalesce(metadata->>'reviewerDivisionId', '')) = $2
        )
      ORDER BY created_at DESC
      LIMIT $3`,
    [isDivisionScopedReviewer, normalizedDivisionId, normalizedLimit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    reviewer_user_id: row.actor_user_id,
    reviewer_email: row.metadata?.reviewerEmail || null,
    reviewer_type: row.metadata?.reviewerType || null,
    reviewer_division_id: row.metadata?.reviewerDivisionId || null,
    action: row.action === "pending_badges_approved" ? "approve" : "deny",
    processed_count: Number(row.metadata?.processedCount || 0),
    skipped_count: Number(row.metadata?.skippedCount || 0),
    badge_ids: row.metadata?.badgeIds || [],
    details: {
      processed: row.metadata?.processed || [],
      skipped: row.metadata?.skipped || []
    },
    created_at: row.created_at
  }));
}

async function resolveActorContext(requesterEmail = "") {
  const normalizedRequesterEmail = String(requesterEmail || "").trim().toLowerCase();

  if (normalizedRequesterEmail) {
    const byEmailResult = await query(
      `SELECT id, division_id
         FROM users
        WHERE email = $1
          AND enabled = true
          AND active = true
        LIMIT 1`,
      [normalizedRequesterEmail]
    );

    if (byEmailResult.rows[0]) {
      return byEmailResult.rows[0];
    }
  }

  const fallbackResult = await query(
    `SELECT id, division_id
       FROM users
      WHERE enabled = true
        AND active = true
      ORDER BY CASE
                 WHEN lower(type::text) = 'super_usuario' THEN 0
                 WHEN lower(type::text) = 'super_usuerio' THEN 0
                 WHEN lower(type::text) = 'administrador' THEN 1
                 ELSE 2
               END,
               updated_at DESC
      LIMIT 1`
  );

  if (!fallbackResult.rows[0]) {
    throw new Error("No active users available to attribute DB operations");
  }

  return fallbackResult.rows[0];
}

export async function upsertIssuerProfile(profile) {
  const issuerId = String(profile?.id || "").trim();

  if (!issuerId) {
    throw new Error("Issuer profile id is required");
  }

  const issuerName = String(profile?.name || "Issuer").trim() || "Issuer";
  const issuerUrl = String(profile?.url || issuerId).trim() || issuerId;
  const issuerEmail = String(profile?.email || "issuer@local.invalid").trim().toLowerCase() || "issuer@local.invalid";
  const issuerDescription = String(profile?.description || "").trim();

  await query(
    `INSERT INTO issuers (id, name, url, email, description, profile)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            url = EXCLUDED.url,
            email = EXCLUDED.email,
            description = EXCLUDED.description,
            profile = EXCLUDED.profile,
            updated_at = now()`,
    [issuerId, issuerName, issuerUrl, issuerEmail, issuerDescription, JSON.stringify(profile || {})]
  );

  return issuerId;
}

export async function listAchievementsFromDb() {
  const result = await query(
    `SELECT achievement_json
       FROM achievements
      ORDER BY updated_at DESC, name ASC`
  );

  return result.rows.map((row) => row.achievement_json);
}

export async function findAchievementFromDb(id) {
  const result = await query(
    `SELECT achievement_json
       FROM achievements
      WHERE id = $1
      LIMIT 1`,
    [id]
  );

  return result.rows[0]?.achievement_json || null;
}

export async function achievementHasIssuedBadges(id) {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
         FROM issued_badges
        WHERE achievement_id = $1
     ) AS has_issued_badges`,
    [id]
  );

  return result.rows[0]?.has_issued_badges === true;
}

export async function createAchievementInDb({ id, achievement, requesterEmail, issuerProfile }) {
  const actor = await resolveActorContext(requesterEmail);
  const issuerId = await upsertIssuerProfile(issuerProfile);

  const result = await query(
    `INSERT INTO achievements (
        id,
        iri,
        issuer_id,
        created_by_user_id,
        division_id,
        name,
        description,
        criteria_narrative,
        image_id,
        image_type,
        revocable,
        validity,
        validity_months,
        auto_revocation,
        valid_until,
        approved,
        approved_by_user_id,
        approved_at,
        achievement_json
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12::validity_preset,
        $13,
        $14,
        $15,
        true,
        $4,
        now(),
        $16::jsonb
      )
      RETURNING achievement_json`,
    [
      id,
      achievement.id,
      issuerId,
      actor.id,
      actor.division_id,
      achievement.name,
      achievement.description,
      achievement.criteria?.narrative || "",
      achievement.image?.id || "",
      achievement.image?.type || "Image",
      achievement.revocable !== false,
      achievement.validityPreset || "1y",
      achievement.validityMonths || null,
      achievement.autoRevocation !== false,
      achievement.validUntil || null,
      JSON.stringify(achievement)
    ]
  );

  return result.rows[0]?.achievement_json || null;
}

export async function updateAchievementInDb({ id, achievement, requesterEmail, issuerProfile }) {
  const actor = await resolveActorContext(requesterEmail);
  const issuerId = await upsertIssuerProfile(issuerProfile);

  const result = await query(
    `UPDATE achievements
        SET iri = $2,
            issuer_id = $3,
            created_by_user_id = $4,
            division_id = $5,
            name = $6,
            description = $7,
            criteria_narrative = $8,
            image_id = $9,
            image_type = $10,
            revocable = $11,
            validity = $12::validity_preset,
            validity_months = $13,
            auto_revocation = $14,
            valid_until = $15,
            approved = true,
            approved_by_user_id = $4,
            approved_at = now(),
            achievement_json = $16::jsonb,
            updated_at = now()
      WHERE id = $1
      RETURNING achievement_json`,
    [
      id,
      achievement.id,
      issuerId,
      actor.id,
      actor.division_id,
      achievement.name,
      achievement.description,
      achievement.criteria?.narrative || "",
      achievement.image?.id || "",
      achievement.image?.type || "Image",
      achievement.revocable !== false,
      achievement.validityPreset || "1y",
      achievement.validityMonths || null,
      achievement.autoRevocation !== false,
      achievement.validUntil || null,
      JSON.stringify(achievement)
    ]
  );

  return result.rows[0]?.achievement_json || null;
}

export async function deleteAchievementFromDb(id) {
  const result = await query(
    `DELETE FROM achievements
      WHERE id = $1
      RETURNING id`,
    [id]
  );

  return Boolean(result.rows[0]);
}

export async function listIssuedBadgesFromDb() {
  const result = await query(
    `SELECT id,
            credential,
            jwt,
            status,
            revocable,
            auto_revocation,
          division_id,
            approved,
            approved_at,
            approved_by_user_id,
            issued_at,
            revoked_at,
            revoked_reason
       FROM issued_badges
      ORDER BY issued_at DESC, created_at DESC`
  );

  return result.rows.map(mapIssuedBadgeRow);
}

export async function findIssuedBadgeFromDb(id) {
  const result = await query(
    `SELECT id,
            credential,
            jwt,
            status,
            revocable,
            auto_revocation,
          division_id,
            approved,
            approved_at,
            approved_by_user_id,
            issued_at,
            revoked_at,
            revoked_reason
       FROM issued_badges
      WHERE id = $1
      LIMIT 1`,
    [id]
  );

  return mapIssuedBadgeRow(result.rows[0]);
}

export async function createIssuedBadgeInDb({
  id,
  credential,
  jwt,
  achievementId,
  recipientEmail,
  recipientName,
  validUntil,
  revocable,
  autoRevocation,
  requiresApproval,
  requesterEmail,
  issuerProfile
}) {
  const actor = await resolveActorContext(requesterEmail);
  const issuerId = await upsertIssuerProfile(issuerProfile);

  const result = await query(
    `INSERT INTO issued_badges (
        id,
        credential_id,
        issuer_id,
        achievement_id,
        created_by_user_id,
        division_id,
        recipient_email,
        recipient_subject,
        recipient_name,
        credential,
        jwt,
        status,
        revocable,
        auto_revocation,
        issued_at,
        valid_until,
        approved,
        approved_by_user_id,
        approved_at,
        revoked_at,
        revoked_reason
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10::jsonb,
        $11,
        CASE WHEN $15 THEN 'pending_review'::badge_status ELSE 'active'::badge_status END,
        $12,
        $13,
        now(),
        $14,
        NOT $15,
        CASE WHEN $15 THEN NULL ELSE $5::uuid END,
        CASE WHEN $15 THEN NULL ELSE now() END,
        NULL,
        NULL
      )
      RETURNING id,
                credential,
                jwt,
                status,
                revocable,
                auto_revocation,
          division_id,
                approved,
                approved_at,
                approved_by_user_id,
                issued_at,
                revoked_at,
                revoked_reason`,
    [
      id,
      credential.id,
      issuerId,
      achievementId,
      actor.id,
      actor.division_id,
      recipientEmail,
      credential?.credentialSubject?.id || `mailto:${recipientEmail}`,
      recipientName,
      JSON.stringify(credential),
      jwt,
      revocable !== false,
      autoRevocation !== false,
      validUntil || null,
      requiresApproval === true
    ]
  );

  return mapIssuedBadgeRow(result.rows[0]);
}

export async function revokeIssuedBadgeInDb({ id, credential, revokedAt, revokedReason }) {
  const result = await query(
    `UPDATE issued_badges
        SET status = 'revoked',
            revoked_at = $2,
            revoked_reason = $3,
            credential = $4::jsonb,
            updated_at = now()
      WHERE id = $1
      RETURNING id,
                credential,
                jwt,
                status,
                revocable,
                auto_revocation,
                division_id,
                approved,
                approved_at,
                approved_by_user_id,
                issued_at,
                revoked_at,
                revoked_reason`,
    [id, revokedAt, revokedReason, JSON.stringify(credential)]
  );

  return mapIssuedBadgeRow(result.rows[0]);
}

export async function approveIssuedBadgeInDb({ id, approvedByUserId }) {
  const result = await query(
    `UPDATE issued_badges
        SET status = 'active',
            approved = true,
            approved_by_user_id = $2,
            approved_at = now(),
            updated_at = now()
      WHERE id = $1
      RETURNING id,
                credential,
                jwt,
                status,
                revocable,
                auto_revocation,
                division_id,
                approved,
                approved_at,
                approved_by_user_id,
                issued_at,
                revoked_at,
                revoked_reason`,
    [id, approvedByUserId]
  );

  return mapIssuedBadgeRow(result.rows[0]);
}

async function applyCompatibilityMigrations() {
  await query("ALTER TYPE badge_status ADD VALUE IF NOT EXISTS 'pending_review'");
  await query("ALTER TABLE issued_badges DROP CONSTRAINT IF EXISTS issued_badges_revocation_fields");
  await query(`
    ALTER TABLE issued_badges
    ADD CONSTRAINT issued_badges_revocation_fields CHECK (
      (status IN ('active', 'pending_review') AND revoked_at IS NULL)
      OR (status = 'revoked' AND revoked_at IS NOT NULL)
    )
  `);
  await query("ALTER TABLE issued_badges DROP CONSTRAINT IF EXISTS issued_badges_must_be_approved");
  await query(`
    CREATE OR REPLACE FUNCTION ensure_badge_is_approved_on_issue()
    RETURNS trigger AS $$
    BEGIN
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await query("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pending_badges_approved'");
  await query("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pending_badges_denied'");
}

export async function deleteIssuedBadgeFromDb(id) {
  const result = await query(
    `DELETE FROM issued_badges
      WHERE id = $1
      RETURNING id`,
    [id]
  );

  return Boolean(result.rows[0]);
}

export async function initializeDatabaseConnection() {
  if (!isDatabaseConfigured) {
    const message = "Database is not configured. Set DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD.";

    if (databaseRequired) {
      throw new Error(message);
    }

    console.warn(`${message} Continuing because DB_REQUIRED=false.`);
    return null;
  }

  let lastError;

  for (let attempt = 1; attempt <= databaseConnectRetries; attempt += 1) {
    try {
      const database = await checkDatabaseConnection();
      await applyCompatibilityMigrations();
      console.log(`Connected to PostgreSQL database ${database.database} (${database.version})`);
      return database;
    } catch (error) {
      lastError = error;

      if (attempt === databaseConnectRetries) {
        break;
      }

      const retryDelay = getRetryDelay(attempt);
      console.warn(
        `PostgreSQL connection attempt ${attempt}/${databaseConnectRetries} failed: ${error.message}. Retrying in ${retryDelay}ms...`
      );
      await sleep(retryDelay);
    }
  }

  throw new Error(
    `Could not connect to PostgreSQL after ${databaseConnectRetries} attempts: ${lastError?.message || "unknown error"}`
  );
}

export async function closeDatabase() {
  await pool.end();
}