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

$genres = encode_json_list($data['genres'] ?? []);
$platforms = encode_json_list($data['platforms'] ?? []);
$screenshots = encode_json_list($data['screenshots'] ?? []);
$relatedGames = encode_json_list($data['relatedGames'] ?? []);
$allowedStatuses = ['draft', 'published'];

if (isset($data['status']) && !in_array((string) $data['status'], $allowedStatuses, true)) {
    respond(['error' => 'Invalid status'], 400);
}

$imageUrl = array_key_exists('imageUrl', $data) ? trim((string) $data['imageUrl']) : null;
$videoUrl = array_key_exists('videoUrl', $data) ? normalize_youtube_url((string) $data['videoUrl']) : null;
$authorName = array_key_exists('authorName', $data) ? trim((string) $data['authorName']) : null;
if ($authorName === '') {
    $authorName = null;
}
if ($imageUrl !== null && $imageUrl !== '' && !is_valid_http_url($imageUrl)) {
    respond(['error' => 'Invalid imageUrl. Use a full http:// or https:// URL.'], 400);
}
if ($videoUrl !== null && $videoUrl !== '' && !is_valid_http_url($videoUrl)) {
    respond(['error' => 'Invalid videoUrl. Use a full YouTube URL.'], 400);
}

try {
    $statement = $conn->prepare(
        'UPDATE content SET
          author_name = COALESCE(:author_name, author_name),
          title = COALESCE(:title, title),
          excerpt = COALESCE(:excerpt, excerpt),
          body = COALESCE(:body, body),
          image_url = COALESCE(:image_url, image_url),
          video_url = COALESCE(:video_url, video_url),
          genres_json = COALESCE(:genres_json, genres_json),
          platforms_json = COALESCE(:platforms_json, platforms_json),
          screenshots_json = COALESCE(:screenshots_json, screenshots_json),
          related_games_json = COALESCE(:related_games_json, related_games_json),
          bard_score = COALESCE(:bard_score, bard_score),
          build_quality = COALESCE(:build_quality, build_quality),
          respects_time = COALESCE(:respects_time, respects_time),
          steam_deck = COALESCE(:steam_deck, steam_deck),
          steam_deck_fps = COALESCE(:steam_deck_fps, steam_deck_fps),
          status = COALESCE(:status, status),
          updated_at = NOW()
         WHERE id = :id'
    );

    $statement->execute([
        ':author_name' => $authorName,
        ':title' => $data['title'] ?? null,
        ':excerpt' => $data['excerpt'] ?? null,
        ':body' => $data['body'] ?? null,
        ':image_url' => $imageUrl,
        ':video_url' => $videoUrl,
        ':genres_json' => $genres ?: null,
        ':platforms_json' => $platforms ?: null,
        ':screenshots_json' => $screenshots ?: null,
        ':related_games_json' => $relatedGames ?: null,
        ':bard_score' => $data['bardScore'] ?? null,
        ':build_quality' => $data['buildQuality'] ?? null,
        ':respects_time' => $data['respectsYourTime'] ?? null,
        ':steam_deck' => isset($data['steamDeck']) ? ((bool) $data['steamDeck'] ? 1 : 0) : null,
        ':steam_deck_fps' => $data['steamDeckFps'] ?? null,
        ':status' => $data['status'] ?? null,
        ':id' => $id
    ]);

    if ($statement->rowCount() === 0) {
        $exists = $conn->prepare('SELECT id FROM content WHERE id = :id LIMIT 1');
        $exists->bindValue(':id', $id, PDO::PARAM_INT);
        $exists->execute();
        if (!$exists->fetch()) {
            respond(['error' => 'Content not found'], 404);
        }
    }
} catch (Throwable $error) {
    respond(['error' => 'Update failed', 'details' => $error->getMessage()], 500);
}

respond(['success' => true]);
