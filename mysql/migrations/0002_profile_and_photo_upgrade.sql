-- One-time migration for the "UI & Feature Upgrade" brief: new
-- compulsory/optional profile fields, and photo-moderation logging.
-- Run this ONCE against your existing production database (the one
-- mysql/schema.sql was already applied to) — it does not replace
-- schema.sql, which has been updated separately to include all of
-- this for anyone setting up a brand-new database from scratch.
--
-- Religion (own_faith) moves from "only asked if faith_matters_to_them"
-- to "asked of everyone" per the brief's compulsory field list. There
-- was never a DB-level constraint enforcing the old behavior in
-- MySQL (only application code checked it), so nothing to drop here
-- — just new columns.

ALTER TABLE users
  ADD COLUMN community ENUM('chinese', 'malay', 'indian', 'eurasian', 'other') AFTER own_faith,
  ADD COLUMN relationship_intent ENUM('marriage_minded', 'open_to_marriage', 'not_sure') AFTER community,
  ADD COLUMN education_level ENUM('secondary', 'diploma', 'bachelors', 'masters', 'phd', 'other') AFTER occupation,
  ADD COLUMN height_cm INT AFTER education_level,
  ADD COLUMN smoking ENUM('non_smoker', 'occasional', 'regular') AFTER height_cm,
  ADD COLUMN drinking ENUM('non_drinker', 'social', 'regular') AFTER smoking,
  ADD COLUMN terms_accepted_at DATETIME AFTER drinking,
  ADD COLUMN photo_consent_accepted_at DATETIME AFTER terms_accepted_at,
  ADD COLUMN last_login_at DATETIME AFTER photo_consent_accepted_at;

-- Logs moderation rejections (event only, never the image itself) so
-- patterns of abuse can be reviewed later — see src/lib/moderation.ts.
CREATE TABLE IF NOT EXISTS photo_moderation_log (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  reason VARCHAR(255) NOT NULL, -- e.g. 'explicit_content', 'no_face_detected', 'provider_error'
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_photo_moderation_log_user (user_id)
);
