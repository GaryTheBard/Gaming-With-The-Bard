<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();
require_write_token($cfg);
$conn = db_connect($cfg);

$data = read_json_body();
$id = (int) ($data['id'] ?? 0);
if ($id <= 0) {
    respond(['error' => 'Missing numeric content id'], 400);
}

$genres = json_encode(array_values(array_filter($data['genres'] ?? [], fn($x) => is_string($x) && $x !== '')));
$platforms = json_encode(array_values(array_filter($data['platforms'] ?? [], fn($x) => is_string($x) && $x !== '')));
$screenshots = json_encode(array_values(array_filter($data['screenshots'] ?? [], fn($x) => is_string($x) && $x !== '')));

$result = pg_query_params(
    $conn,
    'UPDATE content SET
      title = COALESCE($1, title),
      excerpt = COALESCE($2, excerpt),
      body = COALESCE($3, body),
      image_url = COALESCE($4, image_url),
      video_url = COALESCE($5, video_url),
      genres_json = COALESCE($6::jsonb, genres_json),
      platforms_json = COALESCE($7::jsonb, platforms_json),
      screenshots_json = COALESCE($8::jsonb, screenshots_json),
      bard_score = COALESCE($9, bard_score),
      build_quality = COALESCE($10, build_quality),
      respects_time = COALESCE($11, respects_time),
      solo_friendly = COALESCE($12, solo_friendly),
      controller_support = COALESCE($13, controller_support),
      steam_deck = COALESCE($14, steam_deck),
      steam_deck_fps = COALESCE($15, steam_deck_fps),
      status = COALESCE($16, status),
      updated_at = NOW()
     WHERE id = $17
     RETURNING *',
    [
        $data['title'] ?? null,
        $data['excerpt'] ?? null,
        $data['body'] ?? null,
        $data['imageUrl'] ?? null,
        $data['videoUrl'] ?? null,
        $genres ?: null,
        $platforms ?: null,
        $screenshots ?: null,
        $data['bardScore'] ?? null,
        $data['buildQuality'] ?? null,
        $data['respectsYourTime'] ?? null,
        isset($data['soloFriendly']) ? (bool) $data['soloFriendly'] : null,
        isset($data['controllerSupport']) ? (bool) $data['controllerSupport'] : null,
        isset($data['steamDeck']) ? (bool) $data['steamDeck'] : null,
        $data['steamDeckFps'] ?? null,
        $data['status'] ?? null,
        $id
    ]
);

if (!$result) {
    respond(['error' => 'Update failed', 'details' => pg_last_error($conn)], 500);
}

$row = pg_fetch_assoc($result);
if (!$row) {
    respond(['error' => 'Content not found'], 404);
}

respond(['success' => true]);
