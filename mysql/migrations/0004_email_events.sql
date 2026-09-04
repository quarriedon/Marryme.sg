-- One-time migration adding a log of automated lifecycle emails sent
-- to each user (welcome, incomplete-profile nudge — see
-- src/lib/email.ts and src/app/api/cron/nudge-incomplete-profiles).
-- The unique constraint is what actually prevents a duplicate send:
-- the nudge cron can run as often as you like without emailing
-- anyone twice.

CREATE TABLE IF NOT EXISTS email_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  email_type ENUM('welcome', 'incomplete_profile_nudge') NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_email_events_user_type (user_id, email_type)
);
