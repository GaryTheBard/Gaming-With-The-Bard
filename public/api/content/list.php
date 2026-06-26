<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();
$conn = db_connect($cfg);

$status = $_GET['status'] ?? 'published';
$statusSql = ($status === 'all') ? null : $status;

$sql = 'SELECT * FROM content';
$params = [];
if ($statusSql !== null) {
    $sql .= ' WHERE status = $1';
    $params[] = $statusSql;
}
$sql .= ' ORDER BY created_at DESC';

$result = $params ? pg_query_params($conn, $sql, $params) : pg_query($conn, $sql);
if (!$result) {
    respond(['error' => 'Query failed'], 500);
}

$items = [];
while ($row = pg_fetch_assoc($result)) {
    $items[] = [
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
    ];
}

respond(['items' => $items]);
