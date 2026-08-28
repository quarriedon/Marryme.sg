-- Run this against your MySQL 8.0+ / MariaDB 10.2+ database (the
-- version matters: default UUIDs and CHECK constraints below need
-- MySQL 8.0.16+ or MariaDB 10.2+; ask your Plesk host if unsure).
--
-- There is no row-level security here — MySQL doesn't have it.
-- Every access rule that used to live in a Supabase RLS policy is
-- now enforced in application code instead (see src/lib/auth.ts and
-- the route handlers under src/app/api/). Never query these tables
-- from a Client Component; always go through a server-side route,
-- Server Action, or Server Component that has already checked
-- `auth()`.
--
-- Matching mechanic: see src/lib/matching/engine.ts. Each user gets
-- a batch of 5 curated matches, can express interest in up to 2, and
-- a mutual match unlocks chat.

-- ============================================================
-- users — combines what used to be Supabase's auth.users (login
-- credentials) and the profiles table, since we now own both.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

  -- Login identifiers. At least one of email/phone will be set;
  -- password_hash is null for phone-only (OTP) accounts.
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(32) UNIQUE,
  password_hash VARCHAR(255),

  full_name VARCHAR(255),
  date_of_birth DATE,
  gender ENUM('male', 'female'),
  -- JSON array of photo URLs, e.g. ["https://.../a.jpg"]. Treat NULL
  -- as an empty array in application code.
  photos JSON,
  bio TEXT,
  location VARCHAR(255),
  occupation VARCHAR(255),

  role ENUM('member', 'admin') NOT NULL DEFAULT 'member',
  status ENUM('pending', 'approved', 'suspended') NOT NULL DEFAULT 'pending',

  -- Faith is asked once, up front, and gates matching rather than
  -- just scoring it. Never shown or asked again if the user says it
  -- doesn't matter to them.
  faith_matters_to_them BOOLEAN NOT NULL DEFAULT FALSE,
  own_faith VARCHAR(255),
  open_to_other_faith BOOLEAN,

  years_out_of_relationship INT,

  preferred_gender ENUM('male', 'female'),
  preferred_age_min INT,
  preferred_age_max INT,
  preferred_location VARCHAR(255),

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- otp_codes — backs phone sign-in/sign-up (replaces Supabase Auth's
-- built-in phone OTP). A code is single-use and short-lived.
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  phone VARCHAR(32) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_otp_codes_phone (phone)
);

-- ============================================================
-- personality_responses (kept from onboarding; informational only —
-- not currently a matching input, see engine.ts)
-- ============================================================
CREATE TABLE IF NOT EXISTS personality_responses (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL UNIQUE,
  answers JSON NOT NULL,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- matches — one row per (user, candidate) in a curated batch.
-- batch_id is shared by the up-to-5 rows generated for a user at
-- once.
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  matched_user_id CHAR(36) NOT NULL,
  batch_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (matched_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT matches_not_self CHECK (user_id <> matched_user_id),
  UNIQUE KEY uniq_matches_user_batch_candidate (user_id, batch_id, matched_user_id),
  INDEX idx_matches_user_batch (user_id, batch_id),
  INDEX idx_matches_expires_at (expires_at)
);

-- ============================================================
-- interests — up to 2 per (user, batch), enforced in application
-- code (the matching engine) rather than a DB constraint, since
-- "up to 2" isn't expressible as a simple unique/check constraint.
-- ============================================================
CREATE TABLE IF NOT EXISTS interests (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  matched_user_id CHAR(36) NOT NULL,
  batch_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (matched_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_interests_user_batch_candidate (user_id, matched_user_id, batch_id),
  INDEX idx_interests_user_batch (user_id, batch_id),
  INDEX idx_interests_reverse_lookup (matched_user_id, user_id)
);

-- ============================================================
-- mutual_matches — created when interest is reciprocal.
-- ============================================================
CREATE TABLE IF NOT EXISTS mutual_matches (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_a_id CHAR(36) NOT NULL,
  user_b_id CHAR(36) NOT NULL,
  matched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'ended') NOT NULL DEFAULT 'active',
  -- Placeholder duration (2 weeks per the build spec) — confirm the
  -- final cooling-off period before launch.
  cooling_off_until DATETIME,

  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT mutual_matches_not_self CHECK (user_a_id <> user_b_id),
  CONSTRAINT mutual_matches_ordered_pair CHECK (user_a_id < user_b_id),
  INDEX idx_mutual_matches_user_a (user_a_id),
  INDEX idx_mutual_matches_user_b (user_b_id)
);

DELIMITER //
CREATE TRIGGER IF NOT EXISTS mutual_matches_set_cooling_off
BEFORE UPDATE ON mutual_matches
FOR EACH ROW
BEGIN
  IF NEW.status = 'ended' AND OLD.status <> 'ended' AND NEW.cooling_off_until IS NULL THEN
    SET NEW.cooling_off_until = DATE_ADD(NOW(), INTERVAL 14 DAY);
  END IF;
END//
DELIMITER ;

-- ============================================================
-- messages — only between two users with an active mutual_match
-- (enforced in application code — see src/lib/matching for the
-- access pattern used elsewhere).
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  mutual_match_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,

  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mutual_match_id) REFERENCES mutual_matches(id) ON DELETE CASCADE,
  INDEX idx_messages_mutual_match (mutual_match_id, created_at)
);

-- ============================================================
-- memberships — gates access to curated matches (Phase 5, Stripe
-- wiring not yet built).
-- ============================================================
CREATE TABLE IF NOT EXISTS memberships (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  tier ENUM('founding', 'regular', 'priority') NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_memberships_user (user_id)
);

-- ============================================================
-- counselling_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS counselling_requests (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  counsellor_type ENUM('relationship', 'marriage', 'religious') NOT NULL,
  status ENUM('pending', 'contacted', 'closed') NOT NULL DEFAULT 'pending',

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_counselling_requests_user (user_id)
);
