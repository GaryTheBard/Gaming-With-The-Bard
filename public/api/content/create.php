<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();
require_write_token($cfg);
$conn = db_connect($cfg);

$data = read_json_body();

$title = trim((string) ($data['title'] ?? ''));
$type = trim((string) ($data['type'] ?? 'article'));
$excerpt = trim((string) ($data['excerpt'] ?? ''));
$body = trim((string) ($data['body'] ?? ''));

if ($title === '' || $excerpt === '') {
    respond(['error' => 'Title and excerpt are required'], 400);
}

$slug = trim((string) ($data['slug'] ?? ''));
if ($slug === '') {
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $title) ?? '');
    $slug = trim($slug, '-');
}
if ($slug === '') {
    $slug = 'entry-' . bin2hex(random_bytes(4));
}
$slug .= '-' . bin2hex(random_bytes(3));

$genres = json_encode(array_values(array_filter($data['genres'] ?? [], fn($x) => is_string($x) && $x !== '')));
$platforms = json_encode(array_values(array_filter($data['platforms'] ?? [], fn($x) => is_string($x) && $x !== '')));
$screenshots = json_encode(array_values(array_filter($data['screenshots'] ?? [], fn($x) => is_string($x) && $x !== '')));

$result = pg_query_params(
    $conn,
    'INSERT INTO content (
      type, title, slug, excerpt, body, image_url, video_url, genres_json, platforms_json, screenshots_json,
      bard_score, build_quality, respects_time, solo_friendly, controller_support, steam_deck, steam_deck_fps,
      status, created_at, updated_at, published_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,
      $11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW(),CASE WHEN $18 = \'published\' THEN NOW() ELSE NULL END
    ) RETURNING *',
    [
        $type,
        $title,
        $slug,
        $excerpt,
        $body,
        $data['imageUrl'] ?? null,
        $data['videoUrl'] ?? null,
        $genres ?: '[]',
        $platforms ?: '[]',
        $screenshots ?: '[]',
        $data['bardScore'] ?? null,
        $data['buildQuality'] ?? null,
        $data['respectsYourTime'] ?? null,
        isset($data['soloFriendly']) ? (bool) $data['soloFriendly'] : true,
        isset($data['controllerSupport']) ? (bool) $data['controllerSupport'] : true,
        isset($data['steamDeck']) ? (bool) $data['steamDeck'] : false,
        $data['steamDeckFps'] ?? null,
        $data['status'] ?? 'published'
    ]
);

if (!$result) {
    respond(['error' => 'Insert failed', 'details' => pg_last_error($conn)], 500);
}

$row = pg_fetch_assoc($result);
if (!$row) {
    respond(['error' => 'Insert failed'], 500);
}

respond([
    'item' => [
        'id' => $row['id'],
        'type' => $row['type'],
        'title' => $row['title'],
        'slug' => $row['slug'],
        'excerpt' => $row['excerpt'],
        'body' => $row['body'],
        'imageUrl' => $row['image_url'],
        'videoUrl' => $row['video_url'],
        'genres' => json_decode($row['genres_json'] ?? '[]', true) ?: [],
        'platforms' => json_decode($row['platforms_json'] ?? '[]', true) ?: [],
        'screenshots' => json_decode($row['screenshots_json'] ?? '[]', true) ?: [],
        'bardScore' => $row['bard_score'] !== null ? (float) $row['bard_score'] : null,
        'buildQuality' => $row['build_quality'] !== null ? (float) $row['build_quality'] : null,
        'respectsYourTime' => $row['respects_time'],
        'soloFriendly' => $row['solo_friendly'] === 't',
        'controllerSupport' => $row['controller_support'] === 't',
        'steamDeck' => $row['steam_deck'] === 't',
        'steamDeckFps' => $row['steam_deck_fps'] ?? '',
        'status' => $row['status'],
        'createdAt' => strtotime((string) $row['created_at']) * 1000
    ]
], 201);
