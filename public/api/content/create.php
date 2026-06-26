<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();
require_write_token($cfg);
$conn = db_connect($cfg);

$data = read_json_body();

$title = trim((string) ($data['title'] ?? ''));
$authorName = trim((string) ($data['authorName'] ?? ''));
$type = trim((string) ($data['type'] ?? 'article'));
$excerpt = trim((string) ($data['excerpt'] ?? ''));
$body = trim((string) ($data['body'] ?? ''));
$allowedTypes = ['review', 'article'];
$allowedStatuses = ['draft', 'published'];

if (!in_array($type, $allowedTypes, true)) {
    respond(['error' => 'Invalid content type'], 400);
}

if ($title === '' || $excerpt === '') {
    respond(['error' => 'Title and excerpt are required'], 400);
}
if ($authorName === '') {
    $authorName = 'Gaming With The Bard';
}
if ($body === '') {
    respond(['error' => 'Body is required'], 400);
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
$relatedGames = json_encode(array_values(array_filter($data['relatedGames'] ?? [], fn($x) => is_string($x) && $x !== '')));
$status = (string) ($data['status'] ?? 'published');

if (!in_array($status, $allowedStatuses, true)) {
    respond(['error' => 'Invalid status'], 400);
}

$imageUrl = isset($data['imageUrl']) ? trim((string) $data['imageUrl']) : null;
$videoUrl = isset($data['videoUrl']) ? trim((string) $data['videoUrl']) : null;
if ($imageUrl !== null && $imageUrl !== '' && filter_var($imageUrl, FILTER_VALIDATE_URL) === false) {
    respond(['error' => 'Invalid imageUrl'], 400);
}
if ($videoUrl !== null && $videoUrl !== '' && filter_var($videoUrl, FILTER_VALIDATE_URL) === false) {
    respond(['error' => 'Invalid videoUrl'], 400);
}

try {
    $statement = $conn->prepare(
        'INSERT INTO content (
          type, title, author_name, slug, excerpt, body, image_url, video_url, genres_json, platforms_json, screenshots_json,
          related_games_json, bard_score, build_quality, respects_time, steam_deck, steam_deck_fps,
          status, created_at, updated_at, published_at
        ) VALUES (
          :type, :title, :author_name, :slug, :excerpt, :body, :image_url, :video_url, :genres_json, :platforms_json, :screenshots_json,
          :related_games_json, :bard_score, :build_quality, :respects_time, :steam_deck, :steam_deck_fps,
          :status, NOW(), NOW(), CASE WHEN :status = "published" THEN NOW() ELSE NULL END
        )'
    );

    $statement->execute([
        ':type' => $type,
        ':title' => $title,
        ':author_name' => $authorName,
        ':slug' => $slug,
        ':excerpt' => $excerpt,
        ':body' => $body,
        ':image_url' => ($imageUrl === '') ? null : $imageUrl,
        ':video_url' => ($videoUrl === '') ? null : $videoUrl,
        ':genres_json' => $genres ?: '[]',
        ':platforms_json' => $platforms ?: '[]',
        ':screenshots_json' => $screenshots ?: '[]',
        ':related_games_json' => $relatedGames ?: '[]',
        ':bard_score' => $data['bardScore'] ?? null,
        ':build_quality' => $data['buildQuality'] ?? null,
        ':respects_time' => $data['respectsYourTime'] ?? null,
        ':steam_deck' => isset($data['steamDeck']) ? ((bool) $data['steamDeck'] ? 1 : 0) : 0,
        ':steam_deck_fps' => $data['steamDeckFps'] ?? null,
        ':status' => $status
    ]);

    $id = (int) $conn->lastInsertId();
    $fetch = $conn->prepare('SELECT * FROM content WHERE id = :id LIMIT 1');
    $fetch->bindValue(':id', $id, PDO::PARAM_INT);
    $fetch->execute();
    $row = $fetch->fetch();
} catch (Throwable $error) {
    respond(['error' => 'Insert failed', 'details' => $error->getMessage()], 500);
}

if (!$row || !is_array($row)) {
    respond(['error' => 'Insert failed'], 500);
}

respond([
    'item' => map_content_row($row)
], 201);
