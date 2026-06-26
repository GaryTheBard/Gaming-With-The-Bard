# Gaming With The Bard

Minimal React app for a focused game review + discovery platform.

## Vision

The product centers around quick decision-making and trust:

- Bard Score with transparent criteria
- Who is this for?
- Respects your time indicator
- Dialogue density and gameplay/story emphasis
- Discovery-first filtering

## Current app features

- React + Vite project baseline
- Search and filtering toolbar
- Content sections for Reviews, Articles, and Video Reviews
- Discovery-friendly review card metadata
- In-app Content Manager to add entries without a rebuild
- Local browser persistence via local storage

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Content manager notes

The current manager stores entries in browser local storage (`gwtb-content-v1`). This is perfect for fast iteration, but it is not multi-device or multi-user.

### Image uploads with PHP (DreamHost friendly)

The manager now supports direct image upload and auto-inserts:

- body tokens like `[img1]`, `[img2]`
- media definitions like `img1: https://... | caption`

Upload endpoint:

- `public/upload-image.php`
- API endpoints:
  - `public/api/content/list.php`
  - `public/api/content/by-slug.php?slug=...`
  - `public/api/content/create.php`
  - `public/api/content/update.php`

Runtime upload folder:

- `public/uploads/` (ignored by git except `.gitkeep`)

For local Vite dev, point the UI to your live PHP endpoint with:

```bash
VITE_UPLOAD_ENDPOINT="https://your-domain.com/upload-image.php"
VITE_USE_API="true"
VITE_API_BASE_URL="https://your-domain.com/api"
VITE_API_WRITE_TOKEN="replace-with-your-token"
```

Without a reachable PHP endpoint, upload calls will fail and show an inline error.

### PostgreSQL setup (self-managed)

1. Create your Postgres DB.
2. Run schema:

```bash
psql -d gaming_with_the_bard -f database/schema.sql
```

3. Copy `public/api/config.php.example` to `public/api/config.php` and fill in DB credentials + write token.
4. Deploy to DreamHost (or your PHP host), ensuring:
   - PHP `pgsql` extension is enabled
   - `public/uploads/` is writable by PHP

When `VITE_USE_API="true"`, the app reads/writes content via your PHP API.
When `false`, it falls back to localStorage.

### Multi-image and screenshot carousel support

- Use **Upload image(s)** in the manager to upload and auto-insert `[imgN]` tokens + `imgN: URL | caption`.
- For detail-page screenshot carousel, add one URL per line in **Screenshot URLs for carousel**.

## Project structure

- `src/App.jsx` - Main app, filtering, manager UI
- `src/seedData.js` - Seed content and sample review/article/video entries
- `src/styles.css` - Minimalistic UI styling
- `src/main.jsx` - App bootstrap
