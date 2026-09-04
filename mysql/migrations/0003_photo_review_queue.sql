-- One-time migration adding manual photo review + the admin panel's
-- data needs. Run this ONCE against your existing production database
-- (after 0002) — schema.sql has been updated separately for anyone
-- setting up a brand-new database from scratch.
--
-- Previously, a photo that failed Google Vision moderation was
-- rejected outright at upload time and never saved. Now it's saved
-- but held invisible (status = 'pending_review') until an admin
-- approves it — see src/app/api/photos/upload/route.ts and
-- src/app/admin/photos/page.tsx.

CREATE TABLE IF NOT EXISTS photos (
  -- Same id as the on-disk filename (see src/lib/storage.ts), not a
  -- fresh UUID — this table only tracks moderation/visibility state
  -- for a file that already exists on disk.
  id VARCHAR(255) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  status ENUM('approved', 'pending_review', 'rejected') NOT NULL DEFAULT 'approved',
  moderation_reason VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewed_by CHAR(36),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_photos_user (user_id),
  INDEX idx_photos_status (status)
);
