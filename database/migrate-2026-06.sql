-- Run in phpMyAdmin if your content table was created before June 2026 updates.

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(120) NOT NULL DEFAULT 'Gaming With The Bard' AFTER title,
  ADD COLUMN IF NOT EXISTS related_games_json JSON NOT NULL DEFAULT ('[]') AFTER screenshots_json;

-- If your MySQL version does not support IF NOT EXISTS on ADD COLUMN, run these one at a time
-- and ignore "Duplicate column" errors:
-- ALTER TABLE content ADD COLUMN author_name VARCHAR(120) NOT NULL DEFAULT 'Gaming With The Bard' AFTER title;
-- ALTER TABLE content ADD COLUMN related_games_json JSON NOT NULL DEFAULT ('[]') AFTER screenshots_json;

UPDATE content SET status = 'published' WHERE status IS NULL OR status = '';
