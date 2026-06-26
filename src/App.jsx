import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

const STORAGE_KEY = "gwtb-content-v1";
const THEME_KEY = "gwtb-theme-v1";
const FX_KEY = "gwtb-fx-v1";
const DRAFT_KEY = "gwtb-draft-v1";
const LOGO_PATH = "/GamingWithTheBardLogo.png";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const USE_API = import.meta.env.VITE_USE_API === "true";
const API_WRITE_TOKEN = import.meta.env.VITE_API_WRITE_TOKEN || "";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=1400&q=80";

const initialForm = {
  type: "review",
  title: "",
  authorName: "",
  excerpt: "",
  imageUrl: "",
  videoUrl: "",
  body: "",
  screenshotsRaw: "",
  bardScore: "",
  genres: "",
  relatedGames: "",
  platforms: [],
  playtimeHours: "",
  difficulty: "Medium",
  steamDeck: false,
  steamDeckFps: ""
};

const reviewPlatforms = ["PC", "PS5", "Xbox Series X|S", "Nintendo Switch"];

const initialFilters = {
  genre: ""
};

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readSavedContent() {
  const parsed = readJsonStorage(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === "object") : [];
}

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    return "dark";
  }
}

function readFxEnabled() {
  try {
    const saved = localStorage.getItem(FX_KEY);
    return saved === null ? false : saved === "1";
  } catch {
    return false;
  }
}

function readDraft() {
  const parsed = readJsonStorage(DRAFT_KEY, initialForm);
  const normalizedType = parsed.type === "article" ? "article" : "review";
  const normalizedPlatforms = Array.isArray(parsed.platforms)
    ? parsed.platforms
    : typeof parsed.platforms === "string"
      ? normalizeList(parsed.platforms)
      : [];
  const normalizedScreenshots = Array.isArray(parsed.screenshots)
    ? parsed.screenshots.join("\n")
    : typeof parsed.screenshotsRaw === "string"
      ? parsed.screenshotsRaw
      : "";
  return {
    ...initialForm,
    ...parsed,
    type: normalizedType,
    platforms: normalizedPlatforms,
    screenshotsRaw: normalizedScreenshots
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeYouTubeUrl(url) {
  const raw = (url || "").trim();
  if (!raw) {
    return "";
  }
  if (raw.includes("youtube.com/embed/")) {
    return raw;
  }
  const shortMatch = raw.match(/youtu\.be\/([^?&/]+)/i);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }
  const watchMatch = raw.match(/[?&]v=([^?&/]+)/i);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  return raw;
}

function normalizeList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isHttpUrl(value) {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseScreenshots(value) {
  return (value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchContentList() {
  const response = await fetch(`${API_BASE}/content/list.php`);
  if (!response.ok) {
    throw new Error(`Failed to load content (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchAdminSession() {
  const response = await fetch(`${API_BASE}/auth/session.php`, {
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error("Failed to check admin session.");
  }
  return response.json();
}

async function loginAdmin(password) {
  const response = await fetch(`${API_BASE}/auth/login.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    throw new Error("Invalid admin password.");
  }
  return response.json();
}

async function logoutAdmin() {
  await fetch(`${API_BASE}/auth/logout.php`, {
    method: "POST",
    credentials: "include"
  });
}

async function createContentRecord(entry) {
  const response = await fetch(`${API_BASE}/content/create.php`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(API_WRITE_TOKEN ? { "X-API-Token": API_WRITE_TOKEN } : {})
    },
    body: JSON.stringify(entry)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload?.details ? `: ${payload.details}` : "";
    throw new Error(`${payload?.error || "Create failed"} (${response.status})${details}`);
  }
  return payload;
}

async function updateContentRecord(entry) {
  const response = await fetch(`${API_BASE}/content/update.php`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(API_WRITE_TOKEN ? { "X-API-Token": API_WRITE_TOKEN } : {})
    },
    body: JSON.stringify(entry)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload?.details ? `: ${payload.details}` : "";
    throw new Error(`${payload?.error || "Update failed"} (${response.status})${details}`);
  }
  return payload;
}

function getNextImageTokenIndex(body) {
  const matches = [...(body || "").matchAll(/\bimg(\d+)\b/gi)];
  if (matches.length === 0) {
    return 0;
  }
  return matches.reduce((max, match) => Math.max(max, Number(match[1] || 0)), 0);
}

function toFormFromEntry(entry) {
  return {
    ...initialForm,
    type: entry.type === "review" ? "review" : "article",
    title: entry.title || "",
    authorName: entry.authorName || "",
    excerpt: entry.excerpt || "",
    imageUrl: entry.imageUrl || "",
    videoUrl: entry.videoUrl || "",
    body: entry.body || "",
    screenshotsRaw: Array.isArray(entry.screenshots) ? entry.screenshots.join("\n") : "",
    bardScore: entry.bardScore ?? "",
    genres: Array.isArray(entry.genres) ? entry.genres.join(", ") : "",
    relatedGames: Array.isArray(entry.relatedGames) ? entry.relatedGames.join(", ") : "",
    platforms: Array.isArray(entry.platforms) ? entry.platforms : [],
    steamDeck: Boolean(entry.steamDeck),
    steamDeckFps: entry.steamDeckFps || ""
  };
}

function normalizeEntry(entry, index) {
  const id = entry.id || `entry-${index + 1}`;
  const title = entry.title || "Untitled";
  const slugBase = entry.slug || slugify(title);
  return {
    ...entry,
    id,
    title,
    slug: `${slugBase || "entry"}-${id}`,
    excerpt: entry.excerpt || "No summary yet.",
    authorName: entry.authorName || "Gaming With The Bard",
    body: entry.body || "",
    imageUrl: entry.imageUrl || FALLBACK_IMAGE,
    platforms: Array.isArray(entry.platforms)
      ? entry.platforms
      : typeof entry.platforms === "string"
        ? normalizeList(entry.platforms)
        : [],
    screenshots: Array.isArray(entry.screenshots)
      ? entry.screenshots
      : typeof entry.screenshots === "string"
        ? normalizeList(entry.screenshots)
        : [],
    genres: Array.isArray(entry.genres) ? entry.genres : [],
    relatedGames: Array.isArray(entry.relatedGames)
      ? entry.relatedGames
      : Array.isArray(entry.similarGames)
        ? entry.similarGames
        : [],
    createdAt: Number(entry.createdAt || 0)
  };
}

function setMeta(title, description) {
  document.title = title;
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag) {
    descTag.setAttribute("content", description);
  }
}

function getEntryPath(entry) {
  const segment = entry.type === "review" ? "reviews" : "articles";
  return `/${segment}/${entry.slug}`;
}

function hasLinkedVideo(entry) {
  return Boolean((entry.videoUrl || "").trim());
}

function parseBodySyntax(rawBody) {
  const lines = (rawBody || "").split(/\r?\n/);
  const mediaMap = {};
  const contentLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const mediaDef = trimmed.match(/^(img\d+|vid\d+)\s*:\s*(.+)$/i);
    if (!mediaDef) {
      contentLines.push(line);
      continue;
    }
    const key = mediaDef[1].toLowerCase();
    const [urlPart, ...captionParts] = mediaDef[2].split("|");
    const url = (urlPart || "").trim();
    if (!url) {
      continue;
    }
    mediaMap[key] = {
      type: key.startsWith("img") ? "image" : "video",
      url: key.startsWith("vid") ? normalizeYouTubeUrl(url) : url,
      caption: captionParts.join("|").trim()
    };
  }

  const blocks = [];
  let paragraphLines = [];
  const flush = () => {
    const text = paragraphLines.join("\n").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphLines = [];
  };

  for (const line of contentLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const token = trimmed.match(/^\[(img\d+|vid\d+)\]$/i);
    if (token) {
      flush();
      blocks.push({ type: "mediaToken", key: token[1].toLowerCase() });
      continue;
    }
    paragraphLines.push(line);
  }
  flush();
  return { blocks, mediaMap };
}

function HeroHoloFx({ enabled, theme }) {
  return (
    <div
      aria-hidden="true"
      className={`hero-fx ${enabled ? "is-on" : "is-off"} ${theme === "light" ? "theme-light" : "theme-dark"}`}
    >
      <div className="hero-fx-layer hero-fx-aurora" />
      <div className="hero-fx-layer hero-fx-sheen" />
      <div className="hero-fx-layer hero-fx-grid" />
    </div>
  );
}

function ArticleBody({ body }) {
  if (!body) {
    return null;
  }
  const { blocks, mediaMap } = parseBodySyntax(body);
  return (
    <div className="article-body">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          const lines = block.text.split("\n");
          return (
            <p key={`p-${index}`}>
              {lines.map((line, lineIndex) => (
                <React.Fragment key={`${line}-${lineIndex}`}>
                  {line}
                  {lineIndex < lines.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </p>
          );
        }
        const media = mediaMap[block.key];
        if (!media) {
          return (
            <p key={`m-${index}`} className="muted small">
              Missing media for [{block.key}]
            </p>
          );
        }
        if (media.type === "video") {
          return (
            <figure className="embed-block" key={`v-${index}`}>
              <iframe
                src={media.url}
                title={media.caption || block.key}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              {media.caption ? <figcaption>{media.caption}</figcaption> : null}
            </figure>
          );
        }
        return (
          <figure className="embed-block" key={`i-${index}`}>
            <img src={media.url} alt={media.caption || block.key} loading="lazy" />
            {media.caption ? <figcaption>{media.caption}</figcaption> : null}
          </figure>
        );
      })}
    </div>
  );
}

function TopBar({ section, onToggleTheme, onToggleFx, theme, fxEnabled, staticPage = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  const sectionLinks = ["all", "review", "article", "videos"].map((value) => ({
    value,
    label:
      value === "all" ? "All" : value === "videos" ? "Videos" : `${value[0].toUpperCase()}${value.slice(1)}s`,
    to: `/?section=${value}`
  }));

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`site-header ${menuOpen ? "is-menu-open" : ""}`}>
      <div className="site-header-inner">
        <nav className="main-nav desktop-only" aria-label="Primary">
          {sectionLinks.map((item) => (
            <Link className={`nav-pill ${section === item.value ? "active" : ""}`} key={item.value} to={item.to}>
              {item.label}
            </Link>
          ))}
          <Link className={`nav-pill ${staticPage === "how-we-rate" ? "active" : ""}`} to="/how-we-rate">
            How We Rate
          </Link>
        </nav>
        <div className="controls desktop-only">
          <button type="button" onClick={onToggleFx}>
            {fxEnabled ? "FX on" : "FX off"}
          </button>
          <button type="button" onClick={onToggleTheme}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
        <button
          className="nav-toggle mobile-only"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-panel"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="mobile-nav-panel mobile-only" id="mobile-nav-panel">
          <nav className="mobile-nav" aria-label="Mobile primary">
            {sectionLinks.map((item) => (
              <Link
                className={`nav-pill ${section === item.value ? "active" : ""}`}
                key={`mobile-${item.value}`}
                to={item.to}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className={`nav-pill ${staticPage === "how-we-rate" ? "active" : ""}`}
              to="/how-we-rate"
              onClick={closeMenu}
            >
              How We Rate
            </Link>
          </nav>
          <div className="mobile-controls">
            <button type="button" onClick={onToggleFx}>
              {fxEnabled ? "FX on" : "FX off"}
            </button>
            <button type="button" onClick={onToggleTheme}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </div>
      {menuOpen ? <button className="nav-backdrop mobile-only" type="button" aria-label="Close menu" onClick={closeMenu} /> : null}
    </header>
  );
}

function ContentCard({ entry }) {
  return (
    <article className="card">
      <img className="thumb" src={entry.imageUrl} alt={entry.title} />
      <div className="card-body">
        <p className="type-pill">{entry.type}</p>
        <h3 className="card-title">{entry.title}</h3>
        <p className="card-byline">By {entry.authorName}</p>
        <p className="card-excerpt">{entry.excerpt}</p>
        {entry.type === "review" ? (
          <div className="stats-grid">
            <span>Bard {entry.bardScore ?? "TBD"}</span>
            <span>Build {entry.buildQuality ?? "TBD"}/10</span>
            <span>Time {entry.respectsYourTime ?? "TBD"}</span>
          </div>
        ) : null}
        <Link className="read-more" to={getEntryPath(entry)}>
          Read more
        </Link>
      </div>
    </article>
  );
}

function ManagerPanel({
  form,
  setForm,
  onSubmit,
  draftSavedAt,
  uploadEndpoint,
  isPublishing,
  submitLabel = "Publish Entry"
}) {
  const [uploadState, setUploadState] = useState({ kind: "idle", message: "" });

  const previewEntry = {
    ...normalizeEntry(
      {
        id: "preview",
        type: form.type,
        title: form.title || "Preview title",
        authorName: form.authorName || "Gaming With The Bard",
        excerpt: form.excerpt || "Preview summary text.",
        body: form.body,
        imageUrl: form.imageUrl || FALLBACK_IMAGE,
        screenshots: parseScreenshots(form.screenshotsRaw),
        bardScore: form.bardScore ? Number(form.bardScore) : undefined
      },
      0
    )
  };

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setUploadState({ kind: "loading", message: `Uploading ${files.length} image(s)...` });

    try {
      const uploaded = [];

      for (const file of files) {
        const payload = new FormData();
        payload.append("image", file);

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          credentials: "include",
          body: payload
        });

        if (!response.ok) {
          throw new Error(`Upload failed (${response.status})`);
        }

        const data = await response.json();
        if (!data?.url) {
          throw new Error("Upload endpoint did not return an image URL.");
        }

        uploaded.push({ url: data.url, fileName: file.name });
      }

      setForm((prev) => {
        let nextIndex = getNextImageTokenIndex(prev.body) + 1;
        const tokenLines = [];
        const definitionLines = [];

        for (const asset of uploaded) {
          const token = `img${nextIndex}`;
          nextIndex += 1;
          const caption = asset.fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
          tokenLines.push(`[${token}]`);
          definitionLines.push(`${token}: ${asset.url} | ${caption}`);
        }

        const existing = (prev.body || "").trimEnd();
        const nextBody = [existing, tokenLines.join("\n\n"), definitionLines.join("\n")]
          .filter(Boolean)
          .join("\n\n");

        return { ...prev, body: nextBody };
      });

      setUploadState({ kind: "success", message: `Uploaded ${uploaded.length} image(s). Tokens inserted.` });
    } catch (error) {
      setUploadState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Upload failed. Verify your PHP endpoint and try again."
      });
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section className="manager">
      <div className="manager-header">
        <h2>Content Manager</h2>
        <p className="muted">Draft autosaves while you type. Publish creates a new detail page instantly.</p>
        <p className="save-indicator">Draft saved {new Date(draftSavedAt).toLocaleTimeString()}</p>
      </div>
      <div className="manager-grid">
        <form className="manager-form" onSubmit={onSubmit}>
          <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="review">Review</option>
            <option value="article">Article</option>
          </select>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Title"
          />
          <input
            value={form.authorName}
            onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))}
            placeholder="Author name (defaults to Gaming With The Bard)"
          />
          <textarea
            required
            value={form.excerpt}
            onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
            placeholder="Short summary"
          />
          <label className="upload-control">
            <span>Upload image(s)</span>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
          </label>
          <textarea
            required
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            placeholder={"Body copy.\n\n[img1]\n\nimg1: https://... | caption"}
          />
          {uploadState.kind !== "idle" ? (
            <p className={`upload-state ${uploadState.kind}`}>{uploadState.message}</p>
          ) : null}
          <textarea
            value={form.screenshotsRaw}
            onChange={(e) => setForm((p) => ({ ...p, screenshotsRaw: e.target.value }))}
            placeholder={"Screenshot URLs for carousel (one per line)"}
          />
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
            placeholder="Cover image URL"
          />
          <input
            value={form.videoUrl}
            onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
            placeholder="YouTube URL (optional)"
          />
          {form.type === "review" ? (
            <>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={form.bardScore}
                onChange={(e) => setForm((p) => ({ ...p, bardScore: e.target.value }))}
                placeholder="Bard score"
              />
              <input
                value={form.genres}
                onChange={(e) => setForm((p) => ({ ...p, genres: e.target.value }))}
                placeholder="Genres: Soulslike, Roguelike"
              />
              <input
                value={form.relatedGames}
                onChange={(e) => setForm((p) => ({ ...p, relatedGames: e.target.value }))}
                placeholder="Related games: Hades, Dead Cells"
              />
              <fieldset className="check-grid">
                <legend>Platforms</legend>
                {reviewPlatforms.map((platform) => (
                  <label key={platform} className="inline-check">
                    <input
                      type="checkbox"
                      checked={form.platforms.includes(platform)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          platforms: e.target.checked
                            ? [...prev.platforms, platform]
                            : prev.platforms.filter((item) => item !== platform)
                        }))
                      }
                    />
                    {platform}
                  </label>
                ))}
              </fieldset>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={form.steamDeck}
                  onChange={(e) => setForm((prev) => ({ ...prev, steamDeck: e.target.checked }))}
                />
                Steam Deck verified
              </label>
              {form.steamDeck ? (
                <input
                  value={form.steamDeckFps}
                  onChange={(e) => setForm((prev) => ({ ...prev, steamDeckFps: e.target.value }))}
                  placeholder="Steam Deck framerate (e.g. 40-50 FPS)"
                />
              ) : null}
            </>
          ) : null}
          <button type="submit" disabled={isPublishing}>
            {isPublishing ? "Saving..." : submitLabel}
          </button>
        </form>
        <div className="manager-preview">
          <h3>Live Preview</h3>
          <ContentCard entry={previewEntry} />
          <ArticleBody body={previewEntry.body} />
        </div>
      </div>
    </section>
  );
}

function MethodologyPanel() {
  return (
    <section className="methodology-panel">
      <h2>Bard Methodology</h2>
      <p className="muted">Every score is built from the same rubric so readers can trust the signal.</p>
      <div className="methodology-grid">
        <div>
          <h3>Bard Score</h3>
          <p>Weighted blend of gameplay depth, build quality, pacing, and replay value.</p>
        </div>
        <div>
          <h3>Respects Your Time</h3>
          <p>Evaluates filler, momentum, and how efficiently the game delivers its best moments.</p>
        </div>
        <div>
          <h3>Who Is This For?</h3>
          <p>Targets audience fit by genre expectations, challenge level, and player preference.</p>
        </div>
        <div>
          <h3>Build Quality</h3>
          <p>Tracks bugs, optimization, UI polish, and platform stability at launch/current patch.</p>
        </div>
      </div>
    </section>
  );
}

function HowWeRatePage({ theme, fxEnabled, onToggleTheme, onToggleFx }) {
  useEffect(() => {
    setMeta(
      "How We Rate | Gaming With The Bard",
      "Transparent methodology behind Bard Score, build quality, and time-respect ratings."
    );
  }, []);

  return (
    <div className="shell">
      <TopBar
        section="all"
        onToggleTheme={onToggleTheme}
        onToggleFx={onToggleFx}
        theme={theme}
        fxEnabled={fxEnabled}
        staticPage="how-we-rate"
      />
      <section className="detail-panel">
        <h1>How We Rate Games</h1>
        <p className="lead">
          We score every game using the same rubric so the verdict is consistent and useful.
        </p>
        <MethodologyPanel />
      </section>
    </div>
  );
}

function HomePage({
  content,
  section,
  setSection,
  query,
  setQuery,
  sortBy,
  setSortBy,
  filters,
  setFilters,
  reviewGenres,
  theme,
  fxEnabled,
  onToggleTheme,
  onToggleFx
}) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMeta(
      "Gaming With The Bard | Reviews and Discovery",
      "Video game reviews, discovery filters, and curated recommendations focused on your time."
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSection = params.get("section");
    if (nextSection && ["all", "review", "article", "videos"].includes(nextSection)) {
      setSection(nextSection);
      return;
    }
    setSection("all");
  }, [location.search, setSection]);

  const visibleItems = useMemo(() => {
    const filtered = content
      .filter((entry) => {
        if (section === "all") {
          return true;
        }
        if (section === "videos") {
          return hasLinkedVideo(entry);
        }
        return entry.type === section;
      })
      .filter((entry) => {
        if (!query) {
          return true;
        }
        const haystack = [
          entry.title,
          entry.authorName,
          entry.excerpt,
          entry.body,
          entry.whoFor,
          ...entry.genres,
          ...entry.relatedGames
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
      .filter((entry) => {
        if (entry.type !== "review") {
          return true;
        }
        if (filters.genre && !entry.genres.includes(filters.genre)) {
          return false;
        }
        return true;
      });

    const sorted = [...filtered];
    if (sortBy === "top_score") {
      sorted.sort((a, b) => Number(b.bardScore || 0) - Number(a.bardScore || 0));
    } else if (sortBy === "shortest") {
      sorted.sort((a, b) => Number(a.playtimeHours || 999) - Number(b.playtimeHours || 999));
    } else if (sortBy === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    }
    return sorted;
  }, [content, filters, query, section, sortBy]);

  return (
    <div className="shell">
      <TopBar
        section={section}
        onToggleTheme={onToggleTheme}
        onToggleFx={onToggleFx}
        theme={theme}
        fxEnabled={fxEnabled}
      />

      <header className="hero">
        <HeroHoloFx enabled={fxEnabled} theme={theme} />
        <img className="hero-logo" src={LOGO_PATH} alt="Gaming With The Bard logo" />
      </header>

      <section className="toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title, genre, body copy, or similar games..."
        />
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="newest">Newest</option>
          <option value="top_score">Top Bard Score</option>
          <option value="shortest">Shortest Playtime</option>
          <option value="title">Title A-Z</option>
        </select>
      </section>

      <section className="toolbar compact">
        <select
          value={filters.genre}
          onChange={(event) => setFilters((prev) => ({ ...prev, genre: event.target.value }))}
        >
          <option value="">All genres</option>
          {reviewGenres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setSortBy("newest");
            setFilters(initialFilters);
            navigate("/");
          }}
        >
          Clear all
        </button>
      </section>

      <section className="meta-row">
        <p>{visibleItems.length} results</p>
      </section>

      <main className="grid">
        {visibleItems.length > 0 ? (
          visibleItems.map((entry) => <ContentCard key={entry.id} entry={entry} />)
        ) : (
          <section className="empty-state">
            <h3>No matches found</h3>
            <p className="muted">
              Try clearing filters or changing search terms. The engine is strict so discovery stays useful.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function DetailPage({ content, theme, fxEnabled, onToggleTheme, onToggleFx }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const entry = content.find((item) => item.slug === slug);

  useEffect(() => {
    if (!entry) {
      setMeta("Not Found | Gaming With The Bard", "Requested content was not found.");
      return;
    }
    setMeta(`${entry.title} | Gaming With The Bard`, entry.excerpt);
  }, [entry]);

  if (!entry) {
    return (
      <div className="shell">
        <TopBar
          section="all"
          onToggleTheme={onToggleTheme}
          onToggleFx={onToggleFx}
          theme={theme}
          fxEnabled={fxEnabled}
        />
        <section className="detail-panel">
          <h1>Content not found</h1>
          <button onClick={() => navigate("/")}>Back home</button>
        </section>
      </div>
    );
  }

  return (
    <div className="shell">
      <TopBar
        section="all"
        onToggleTheme={onToggleTheme}
        onToggleFx={onToggleFx}
        theme={theme}
        fxEnabled={fxEnabled}
      />
      <article className="detail-panel">
        <p className="type-pill">{entry.type}</p>
        <h1>{entry.title}</h1>
        <p className="muted">By {entry.authorName}</p>
        <p className="lead">{entry.excerpt}</p>
        <img className="detail-hero-image" src={entry.imageUrl} alt={entry.title} />
        {entry.screenshots?.length ? (
          <section className="screenshot-section">
            <h3>Screenshots</h3>
            <div className="screenshot-carousel">
              {entry.screenshots.map((url, index) => (
                <img key={`${url}-${index}`} src={url} alt={`${entry.title} screenshot ${index + 1}`} />
              ))}
            </div>
          </section>
        ) : null}
        {entry.type === "review" ? (
          <div className="stats-grid detail-stats">
            <span>Bard Score: {entry.bardScore ?? "TBD"}</span>
            <span>Build Quality: {entry.buildQuality ?? "TBD"}/10</span>
            <span>Respects Your Time: {entry.respectsYourTime ?? "TBD"}</span>
          </div>
        ) : null}
        {entry.videoUrl ? (
          <figure className="embed-block">
            <iframe
              src={normalizeYouTubeUrl(entry.videoUrl)}
              title={`${entry.title} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </figure>
        ) : null}
        <ArticleBody body={entry.body} />
      </article>
    </div>
  );
}

function AdminPage({
  theme,
  fxEnabled,
  onToggleTheme,
  onToggleFx,
  form,
  setForm,
  onPublish,
  content,
  editingId,
  onEditEntry,
  onResetDraft,
  onCancelEdit,
  draftSavedAt,
  uploadEndpoint,
  apiError,
  isPublishing
}) {
  const [password, setPassword] = useState("");
  const [authState, setAuthState] = useState({ checked: false, authenticated: false, error: "" });

  useEffect(() => {
    setMeta("Admin | Gaming With The Bard", "Protected content manager.");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminSession()
      .then((payload) => {
        if (!cancelled) {
          setAuthState({ checked: true, authenticated: Boolean(payload?.authenticated), error: "" });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAuthState({
            checked: true,
            authenticated: false,
            error: error instanceof Error ? error.message : "Failed to verify admin session."
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    try {
      await loginAdmin(password);
      setAuthState({ checked: true, authenticated: true, error: "" });
      setPassword("");
    } catch (error) {
      setAuthState({
        checked: true,
        authenticated: false,
        error: error instanceof Error ? error.message : "Login failed."
      });
    }
  }

  async function handleLogout() {
    await logoutAdmin();
    setAuthState({ checked: true, authenticated: false, error: "" });
  }

  return (
    <div className="shell">
      <TopBar
        section="all"
        onToggleTheme={onToggleTheme}
        onToggleFx={onToggleFx}
        theme={theme}
        fxEnabled={fxEnabled}
      />
      <section className="detail-panel">
        <h1>Admin</h1>
        {!authState.checked ? <p className="muted">Checking session...</p> : null}
        {authState.error ? <p className="api-error">{authState.error}</p> : null}

        {authState.checked && !authState.authenticated ? (
          <form className="admin-login" onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Admin password"
              required
            />
            <button type="submit">Sign in</button>
          </form>
        ) : null}

        {authState.authenticated ? (
          <>
            <section className="meta-row">
              <p className="muted">
                {editingId ? "Editing existing entry." : "Authenticated. You can publish content from this page."}
              </p>
              <div className="meta-actions">
                <button type="button" onClick={onResetDraft}>
                  Reset draft
                </button>
                {editingId ? (
                  <button type="button" onClick={onCancelEdit}>
                    Cancel edit
                  </button>
                ) : null}
                <button type="button" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </section>
            {apiError ? <p className="api-error">{apiError}</p> : null}
            <ManagerPanel
              form={form}
              setForm={setForm}
              onSubmit={onPublish}
              draftSavedAt={draftSavedAt}
              uploadEndpoint={uploadEndpoint}
              isPublishing={isPublishing}
              submitLabel={editingId ? "Save Changes" : "Publish Entry"}
            />
            <section className="admin-existing">
              <h3>Existing posts</h3>
              {content.length === 0 ? (
                <p className="muted">No posts yet.</p>
              ) : (
                <div className="admin-list">
                  {content.map((entry) => (
                    <article className="admin-list-item" key={`admin-${entry.id}`}>
                      <div>
                        <strong>{entry.title}</strong>
                        <p className="muted">
                          {entry.type} - {entry.authorName}
                        </p>
                      </div>
                      <button type="button" onClick={() => onEditEntry(entry)}>
                        Edit
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </div>
  );
}

function App() {
  const [saved, setSaved] = useState(readSavedContent);
  const [remoteContent, setRemoteContent] = useState([]);
  const [apiError, setApiError] = useState("");
  const [theme, setTheme] = useState(readTheme);
  const [fxEnabled, setFxEnabled] = useState(readFxEnabled);
  const [section, setSection] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState(initialFilters);
  const [form, setForm] = useState(readDraft);
  const [draftSavedAt, setDraftSavedAt] = useState(Date.now());
  const [isPublishing, setIsPublishing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const uploadEndpoint = import.meta.env.VITE_UPLOAD_ENDPOINT || "/upload-image.php";

  const content = useMemo(
    () =>
      (USE_API ? remoteContent : saved).map((entry, index) => normalizeEntry(entry, index)),
    [remoteContent, saved]
  );

  const reviewGenres = useMemo(() => {
    const set = new Set(
      content.filter((entry) => entry.type === "review").flatMap((entry) => entry.genres)
    );
    return [...set].sort();
  }, [content]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(FX_KEY, fxEnabled ? "1" : "0");
  }, [fxEnabled]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setDraftSavedAt(Date.now());
  }, [form]);

  useEffect(() => {
    if (!USE_API) {
      return;
    }

    let cancelled = false;
    fetchContentList()
      .then((items) => {
        if (!cancelled) {
          setRemoteContent(items);
          setApiError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setApiError(error instanceof Error ? error.message : "Failed to load content API.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function publishEntry(event) {
    event.preventDefault();
    if (isPublishing) {
      return;
    }
    setApiError("");
    setIsPublishing(true);
    const nextEntry = {
      type: form.type,
      title: form.title.trim(),
      authorName: form.authorName.trim() || "Gaming With The Bard",
      excerpt: form.excerpt.trim(),
      body: form.body.trim(),
      screenshots: parseScreenshots(form.screenshotsRaw),
      imageUrl: form.imageUrl.trim() || FALLBACK_IMAGE,
      videoUrl: form.videoUrl.trim() ? normalizeYouTubeUrl(form.videoUrl) : undefined,
      status: "published",
      createdAt: Date.now()
    };
    if (!nextEntry.title || !nextEntry.excerpt || !nextEntry.body) {
      setApiError("Title, summary, and body are required.");
      setIsPublishing(false);
      return;
    }
    if (nextEntry.imageUrl && !isHttpUrl(nextEntry.imageUrl)) {
      setApiError("Cover image URL must start with http:// or https://.");
      setIsPublishing(false);
      return;
    }
    if (nextEntry.videoUrl && !isHttpUrl(nextEntry.videoUrl)) {
      setApiError("Video URL must start with http:// or https://.");
      setIsPublishing(false);
      return;
    }
    if (nextEntry.screenshots.some((url) => !isHttpUrl(url))) {
      setApiError("Each screenshot URL must start with http:// or https://.");
      setIsPublishing(false);
      return;
    }
    if (form.type === "review") {
      nextEntry.bardScore = form.bardScore ? Number(form.bardScore) : undefined;
      nextEntry.genres = normalizeList(form.genres);
      nextEntry.relatedGames = normalizeList(form.relatedGames);
      nextEntry.platforms = form.platforms;
      nextEntry.playtimeHours = form.playtimeHours ? Number(form.playtimeHours) : undefined;
      nextEntry.difficulty = form.difficulty;
      nextEntry.steamDeck = form.steamDeck;
      nextEntry.steamDeckFps = form.steamDeck ? form.steamDeckFps.trim() : "";
    }
    if (USE_API) {
      try {
        if (editingId) {
          await updateContentRecord({ ...nextEntry, id: Number(editingId) });
          setRemoteContent((prev) =>
            prev.map((entry) =>
              String(entry.id) === String(editingId) ? { ...entry, ...nextEntry, id: entry.id, slug: entry.slug } : entry
            )
          );
        } else {
          const created = await createContentRecord(nextEntry);
          setRemoteContent((prev) => [created.item || nextEntry, ...prev]);
        }
        setApiError("");
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Failed to publish via API.");
        setIsPublishing(false);
        return;
      }
    } else {
      if (editingId) {
        const nextSaved = saved.map((entry) =>
          String(entry.id) === String(editingId) ? { ...entry, ...nextEntry, id: entry.id, slug: entry.slug } : entry
        );
        setSaved(nextSaved);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSaved));
      } else {
        const createdLocal = { ...nextEntry, id: `${form.type}-${Date.now()}` };
        const nextSaved = [createdLocal, ...saved];
        setSaved(nextSaved);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSaved));
      }
    }

    setForm(initialForm);
    setEditingId(null);
    setIsPublishing(false);
  }

  function resetDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setForm(initialForm);
    setEditingId(null);
    setApiError("");
    setDraftSavedAt(Date.now());
  }

  function startEditing(entry) {
    setForm(toFormFromEntry(entry));
    setEditingId(entry.id);
    setApiError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(initialForm);
    setApiError("");
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              content={content}
              section={section}
              setSection={setSection}
              query={query}
              setQuery={setQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filters={filters}
              setFilters={setFilters}
              reviewGenres={reviewGenres}
              theme={theme}
              fxEnabled={fxEnabled}
              onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              onToggleFx={() => setFxEnabled((prev) => !prev)}
            />
          }
        />
        <Route
          path="/:section/:slug"
          element={
            <DetailPage
              content={content}
              theme={theme}
              fxEnabled={fxEnabled}
              onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              onToggleFx={() => setFxEnabled((prev) => !prev)}
            />
          }
        />
        <Route
          path="/how-we-rate"
          element={
            <HowWeRatePage
              theme={theme}
              fxEnabled={fxEnabled}
              onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              onToggleFx={() => setFxEnabled((prev) => !prev)}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <AdminPage
              theme={theme}
              fxEnabled={fxEnabled}
              onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              onToggleFx={() => setFxEnabled((prev) => !prev)}
              form={form}
              setForm={setForm}
              onPublish={publishEntry}
              content={content}
              editingId={editingId}
              onEditEntry={startEditing}
              onResetDraft={resetDraft}
              onCancelEdit={cancelEditing}
              draftSavedAt={draftSavedAt}
              uploadEndpoint={uploadEndpoint}
              apiError={apiError}
              isPublishing={isPublishing}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
