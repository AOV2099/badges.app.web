-- PostgreSQL schema for the BADGES Open Badges 3.0 issuer.
-- This file creates the first relational structure for achievements, issued badges,
-- issuer metadata, users, divisions, approval flow, and audit/verification history.
-- Target: PostgreSQL 16.
-- Run this file while connected to the open_badges database.
-- To create the database first, run create_database.sql from a maintenance database.

BEGIN;

DO $$
BEGIN
  IF current_setting('server_version_num')::integer < 160000 THEN
    RAISE EXCEPTION 'PostgreSQL 16 or newer is required. Current server_version_num: %', current_setting('server_version_num');
  END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_status') THEN
      CREATE TYPE badge_status AS ENUM ('pending_review', 'active', 'revoked');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'validity_preset') THEN
    CREATE TYPE validity_preset AS ENUM ('6m', '1y', '3y', 'none', 'custom');
  END IF;

  ALTER TYPE badge_status ADD VALUE IF NOT EXISTS 'pending_review';

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('super_usuario', 'administrador', 'general');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM (
      'achievement_created',
      'achievement_updated',
      'achievement_deleted',
      'badge_issued',
      'badge_revoked',
      'badge_deleted',
      'badge_verified',
      'pending_badges_approved',
      'pending_badges_denied',
      'admin_login',
      'admin_logout'
    );
  END IF;

  ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pending_badges_approved';
  ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pending_badges_denied';
END
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS issuers (
  id text PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  email citext NOT NULL,
  description text NOT NULL DEFAULT '',
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT issuers_id_url_format CHECK (id ~ '^https?://'),
  CONSTRAINT issuers_url_format CHECK (url ~ '^https?://')
);

DROP TRIGGER IF EXISTS issuers_set_updated_at ON issuers;
CREATE TRIGGER issuers_set_updated_at
BEFORE UPDATE ON issuers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS issuer_keys (
  id text PRIMARY KEY,
  issuer_id text NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'JsonWebKey2020',
  algorithm text NOT NULL DEFAULT 'RS256',
  public_jwk jsonb NOT NULL,
  private_key_ref text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT issuer_keys_id_url_format CHECK (id ~ '^https?://')
);

CREATE INDEX IF NOT EXISTS issuer_keys_issuer_id_idx ON issuer_keys(issuer_id);
CREATE INDEX IF NOT EXISTS issuer_keys_active_idx ON issuer_keys(active) WHERE active;
CREATE INDEX IF NOT EXISTS issuer_keys_public_jwk_gin_idx ON issuer_keys USING gin(public_jwk);

DROP TRIGGER IF EXISTS issuer_keys_set_updated_at ON issuer_keys;
CREATE TRIGGER issuer_keys_set_updated_at
BEFORE UPDATE ON issuer_keys
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS divisions (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT divisions_id_format CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

DROP TRIGGER IF EXISTS divisions_set_updated_at ON divisions;
CREATE TRIGGER divisions_set_updated_at
BEFORE UPDATE ON divisions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email citext NOT NULL UNIQUE,
  type user_type NOT NULL DEFAULT 'general',
  picture_url text NOT NULL DEFAULT '',
  division_id text NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'google',
  provider_subject text,
  password_hash text,
  password_updated_at timestamptz,
  first_login_completed boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT users_picture_url_format CHECK (picture_url = '' OR picture_url ~ '^https?://'),
  CONSTRAINT users_provider_allowed CHECK (provider IN ('google', 'local')),
  CONSTRAINT users_local_password_required CHECK (provider <> 'local' OR password_hash IS NOT NULL),
  UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS users_division_id_idx ON users(division_id);
CREATE INDEX IF NOT EXISTS users_type_idx ON users(type);
CREATE INDEX IF NOT EXISTS users_provider_idx ON users(provider);
CREATE INDEX IF NOT EXISTS users_first_login_completed_idx ON users(first_login_completed);
CREATE INDEX IF NOT EXISTS users_enabled_idx ON users(enabled) WHERE enabled;
CREATE INDEX IF NOT EXISTS users_active_idx ON users(active) WHERE active;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION ensure_approver_can_approve()
RETURNS trigger AS $$
DECLARE
  approver_type user_type;
BEGIN
  IF NEW.approved = false THEN
    RETURN NEW;
  END IF;

  SELECT type INTO approver_type
  FROM users
  WHERE id = NEW.approved_by_user_id
    AND active = true
    AND enabled = true;

  IF approver_type IS NULL THEN
    RAISE EXCEPTION 'approved_by_user_id must reference an active and enabled user';
  END IF;

  IF approver_type NOT IN ('super_usuario', 'administrador') THEN
    RAISE EXCEPTION 'only super_usuario or administrador users can approve records';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_badge_is_approved_on_issue()
RETURNS trigger AS $$
BEGIN
  IF NEW.approved = false THEN
    RAISE EXCEPTION 'issued badges must be approved by an administrador or super_usuario when issued';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY,
  iri text NOT NULL UNIQUE,
  issuer_id text NOT NULL REFERENCES issuers(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  division_id text NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text NOT NULL,
  criteria_narrative text NOT NULL,
  image_id text NOT NULL,
  image_type text NOT NULL DEFAULT 'Image',
  revocable boolean NOT NULL DEFAULT true,
  validity validity_preset NOT NULL DEFAULT '1y',
  validity_months integer,
  auto_revocation boolean NOT NULL DEFAULT true,
  valid_until timestamptz,
  approved boolean NOT NULL DEFAULT false,
  approved_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  achievement_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achievements_slug_format CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT achievements_iri_url_format CHECK (iri ~ '^https?://'),
  CONSTRAINT achievements_image_url_format CHECK (image_id ~ '^(https?://|/)'),
  CONSTRAINT achievements_validity_months CHECK (
    (validity IN ('6m', '1y', '3y') AND validity_months IS NOT NULL AND validity_months > 0)
    OR (validity IN ('none', 'custom') AND validity_months IS NULL)
  ),
  CONSTRAINT achievements_custom_valid_until CHECK (
    validity <> 'custom' OR valid_until IS NOT NULL
  ),
  CONSTRAINT achievements_no_auto_revoke_when_none CHECK (
    validity <> 'none' OR auto_revocation = false
  ),
  CONSTRAINT achievements_approval_fields CHECK (
    (approved = false AND approved_by_user_id IS NULL AND approved_at IS NULL)
    OR (approved = true AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS achievements_issuer_id_idx ON achievements(issuer_id);
CREATE INDEX IF NOT EXISTS achievements_created_by_user_id_idx ON achievements(created_by_user_id);
CREATE INDEX IF NOT EXISTS achievements_division_id_idx ON achievements(division_id);
CREATE INDEX IF NOT EXISTS achievements_approved_idx ON achievements(approved);
CREATE INDEX IF NOT EXISTS achievements_approved_by_user_id_idx ON achievements(approved_by_user_id);
CREATE INDEX IF NOT EXISTS achievements_name_idx ON achievements(name);
CREATE INDEX IF NOT EXISTS achievements_revocable_idx ON achievements(revocable);
CREATE INDEX IF NOT EXISTS achievements_json_gin_idx ON achievements USING gin(achievement_json);

DROP TRIGGER IF EXISTS achievements_set_updated_at ON achievements;
CREATE TRIGGER achievements_set_updated_at
BEFORE UPDATE ON achievements
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS achievements_ensure_approver_can_approve ON achievements;
CREATE TRIGGER achievements_ensure_approver_can_approve
BEFORE INSERT OR UPDATE ON achievements
FOR EACH ROW
EXECUTE FUNCTION ensure_approver_can_approve();

CREATE TABLE IF NOT EXISTS issued_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id text NOT NULL UNIQUE,
  issuer_id text NOT NULL REFERENCES issuers(id) ON DELETE RESTRICT,
  achievement_id text NOT NULL REFERENCES achievements(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  division_id text NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  recipient_email citext NOT NULL,
  recipient_subject text NOT NULL,
  recipient_name text NOT NULL,
  credential jsonb NOT NULL,
  jwt text NOT NULL,
  status badge_status NOT NULL DEFAULT 'active',
  revocable boolean NOT NULL DEFAULT true,
  auto_revocation boolean NOT NULL DEFAULT true,
  issued_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  approved boolean NOT NULL DEFAULT true,
  approved_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT issued_badges_credential_url_format CHECK (credential_id ~ '^https?://'),
  CONSTRAINT issued_badges_recipient_subject_format CHECK (recipient_subject = ('mailto:' || recipient_email::text)),
  CONSTRAINT issued_badges_jwt_format CHECK (jwt ~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  CONSTRAINT issued_badges_revocation_fields CHECK (
     (status IN ('active', 'pending_review') AND revoked_at IS NULL)
     OR (status = 'revoked' AND revoked_at IS NOT NULL)
  ),
  CONSTRAINT issued_badges_approval_fields CHECK (
    (approved = false AND approved_by_user_id IS NULL AND approved_at IS NULL)
    OR (approved = true AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL)
  ),
  CONSTRAINT issued_badges_must_be_approved CHECK (
    approved = true
  )
);

CREATE INDEX IF NOT EXISTS issued_badges_issuer_id_idx ON issued_badges(issuer_id);
CREATE INDEX IF NOT EXISTS issued_badges_achievement_id_idx ON issued_badges(achievement_id);
CREATE INDEX IF NOT EXISTS issued_badges_created_by_user_id_idx ON issued_badges(created_by_user_id);
CREATE INDEX IF NOT EXISTS issued_badges_division_id_idx ON issued_badges(division_id);
CREATE INDEX IF NOT EXISTS issued_badges_recipient_email_idx ON issued_badges(recipient_email);
CREATE INDEX IF NOT EXISTS issued_badges_status_idx ON issued_badges(status);
CREATE INDEX IF NOT EXISTS issued_badges_approved_idx ON issued_badges(approved);
CREATE INDEX IF NOT EXISTS issued_badges_approved_by_user_id_idx ON issued_badges(approved_by_user_id);
CREATE INDEX IF NOT EXISTS issued_badges_issued_at_idx ON issued_badges(issued_at DESC);
CREATE INDEX IF NOT EXISTS issued_badges_valid_until_idx ON issued_badges(valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS issued_badges_active_idx ON issued_badges(id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS issued_badges_credential_gin_idx ON issued_badges USING gin(credential);

DROP TRIGGER IF EXISTS issued_badges_set_updated_at ON issued_badges;
CREATE TRIGGER issued_badges_set_updated_at
BEFORE UPDATE ON issued_badges
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS issued_badges_ensure_approver_can_approve ON issued_badges;
CREATE TRIGGER issued_badges_ensure_approver_can_approve
BEFORE INSERT OR UPDATE ON issued_badges
FOR EACH ROW
EXECUTE FUNCTION ensure_approver_can_approve();

DROP TRIGGER IF EXISTS issued_badges_ensure_badge_is_approved_on_issue ON issued_badges;
CREATE TRIGGER issued_badges_ensure_badge_is_approved_on_issue
BEFORE INSERT OR UPDATE ON issued_badges
FOR EACH ROW
EXECUTE FUNCTION ensure_badge_is_approved_on_issue();

CREATE TABLE IF NOT EXISTS verification_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  badge_id uuid REFERENCES issued_badges(id) ON DELETE SET NULL,
  credential_id text,
  jwt_algorithm text,
  valid boolean NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_events_badge_id_idx ON verification_events(badge_id);
CREATE INDEX IF NOT EXISTS verification_events_credential_id_idx ON verification_events(credential_id);
CREATE INDEX IF NOT EXISTS verification_events_created_at_idx ON verification_events(created_at DESC);
CREATE INDEX IF NOT EXISTS verification_events_checks_gin_idx ON verification_events USING gin(checks);

CREATE TABLE IF NOT EXISTS audit_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS audit_events_action_idx ON audit_events(action);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_metadata_gin_idx ON audit_events USING gin(metadata);

CREATE OR REPLACE VIEW active_badges AS
SELECT *
FROM issued_badges
WHERE status = 'active';

CREATE OR REPLACE VIEW revoked_badges AS
SELECT *
FROM issued_badges
WHERE status = 'revoked';

CREATE OR REPLACE VIEW badge_dashboard_metrics AS
SELECT
  (SELECT count(*) FROM achievements) AS achievements_count,
  (SELECT count(*) FROM achievements WHERE approved = false) AS pending_achievements_count,
  (SELECT count(*) FROM issued_badges) AS issued_badges_count,
  (SELECT count(*) FROM issued_badges WHERE approved = false) AS pending_badges_count,
  (SELECT count(*) FROM issued_badges WHERE status = 'active') AS active_badges_count,
  (SELECT count(*) FROM issued_badges WHERE status = 'revoked') AS revoked_badges_count;

COMMIT;
