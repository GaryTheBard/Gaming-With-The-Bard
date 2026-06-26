<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();
$conn = db_connect($cfg);

$slug = trim((string) ($_GET['slug'] ?? ''));
if ($slug === '') {
    respond(['error' => 'Missing slug'], 400);
}

$result = pg_query_params($conn, 'SELECT * FROM content WHERE slug = $1 LIMIT 1', [$slug]);
if (!$result) {
    respond(['error' => 'Query failed'], 500);
}

$row = pg_fetch_assoc($result);
if (!$row) {
    respond(['error' => 'Not found'], 404);
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
]);
