CREATE TABLE IF NOT EXISTS content (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('review', 'article', 'video')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  video_url TEXT,
  genres_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  platforms_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  screenshots_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  bard_score NUMERIC(4,2),
  build_quality NUMERIC(4,2),
  respects_time TEXT,
  solo_friendly BOOLEAN NOT NULL DEFAULT TRUE,
  controller_support BOOLEAN NOT NULL DEFAULT TRUE,
  steam_deck BOOLEAN NOT NULL DEFAULT FALSE,
  steam_deck_fps TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);
