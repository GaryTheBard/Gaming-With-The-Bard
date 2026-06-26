# Gaming With The Bard - How To Use

This guide explains how to run the app, publish content, upload images, and switch from local mode to your self-managed PostgreSQL + PHP API mode.

## 1) Run the app locally

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:5173`).

## 2) Core app workflow

- Use top nav to filter by `All`, `Reviews`, `Articles`, `Videos`
- Use search + filter controls for discovery
- Click `Read more` to open detail pages
- Use `Open Manager` to create content

## 3) Content Manager basics

Inside manager:

- **Type**: Review / Article / Video
- **Title / Summary**: required
- **Body**: article text (supports media tokens)
- **Cover image URL**: card/detail hero image
- **YouTube URL**: optional

Review-specific fields:

- Bard score
- Genres
- Platforms (multi-checkbox)
- Steam Deck checkbox
- Steam Deck FPS text (appears only when Steam Deck is checked)

## 4) Body syntax for inline images/videos

Use this pattern in the body:

1. Place where media should appear:
   - `[img1]`
   - `[vid1]`
2. Define media URLs anywhere in body:
   - `img1: https://example.com/image.jpg | Optional caption`
   - `vid1: https://youtu.be/abc123 | Optional caption`

Example:

```text
This game has excellent encounter design.

[img1]

Combat pacing stays strong through mid-game.

[vid1]

img1: https://your-site.com/uploads/review-shot.jpg | Boss fight view
vid1: https://youtu.be/abc123 | Full review video
```

## 5) Uploading images from manager

Manager includes **Upload image(s)**:

- Select one or more image files
- App uploads each file to `VITE_UPLOAD_ENDPOINT`
- App auto-inserts:
  - `[imgN]` tokens
  - `imgN: <url> | <caption>` lines

## 6) Screenshot carousel support

Use **Screenshot URLs for carousel** in manager:

- One URL per line
- These show on detail pages in a horizontal screenshot carousel

## 7) Local mode vs API mode

### Local mode (default fallback)

- Content is stored in browser localStorage
- Good for UI prototyping

### API mode (recommended for real publishing)

Set env:

```bash
VITE_USE_API="true"
VITE_API_BASE_URL="https://your-domain.com/api"
VITE_API_WRITE_TOKEN="your-write-token"
VITE_UPLOAD_ENDPOINT="https://your-domain.com/upload-image.php"
```

In API mode:

- reads from `GET /api/content/list.php`
- creates via `POST /api/content/create.php`
- uploads images via `upload-image.php`

## 8) PostgreSQL + PHP setup (self-managed)

1. Create Postgres DB.
2. Run schema:

```bash
psql -d gaming_with_the_bard -f database/schema.sql
```

3. Copy:

- `public/api/config.php.example` -> `public/api/config.php`

4. Fill DB credentials + API write token in `config.php`.
5. Deploy to your PHP host (DreamHost).
6. Ensure:
   - PHP `pgsql` extension enabled
   - `public/uploads/` writable by PHP

## 9) Deployment checklist

- [ ] `public/api/config.php` exists on server
- [ ] DB schema applied
- [ ] Upload endpoint returns JSON with `url`
- [ ] `VITE_*` env values set for production build
- [ ] `uploads` directory writable
- [ ] API write token set and kept private

## 10) Troubleshooting

- **Upload fails immediately**
  - verify `VITE_UPLOAD_ENDPOINT`
  - check CORS and HTTPS domain match
  - ensure PHP upload limits allow your file size

- **API publish fails**
  - check `VITE_API_BASE_URL`
  - verify `VITE_API_WRITE_TOKEN`
  - verify DB credentials in `public/api/config.php`

- **No content appears in API mode**
  - hit `/api/content/list.php` directly in browser
  - confirm table has rows and `status='published'`

---

If you want, next step is adding edit/delete flows in manager so it behaves like a full CMS editor.
