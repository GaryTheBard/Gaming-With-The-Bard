<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if ($error === null) {
        return;
    }

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
    if (!in_array($error['type'], $fatalTypes, true) || headers_sent()) {
        return;
    }

    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $error['message'],
        'file' => basename((string) $error['file']),
        'line' => $error['line']
    ]);
});

function load_config(): array
{
    $configFile = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';
    if (is_file($configFile)) {
        $cfg = require $configFile;
        if (is_array($cfg)) {
            return $cfg;
        }
    }

    return [
        'db_host' => getenv('DB_HOST') ?: '127.0.0.1',
        'db_port' => getenv('DB_PORT') ?: '3306',
        'db_name' => getenv('DB_NAME') ?: '',
        'db_user' => getenv('DB_USER') ?: '',
        'db_password' => getenv('DB_PASSWORD') ?: '',
        'api_write_token' => getenv('API_WRITE_TOKEN') ?: '',
        'admin_password' => getenv('ADMIN_PASSWORD') ?: ''
    ];
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function is_valid_http_url(string $url): bool
{
    return (bool) preg_match('/^https?:\/\/.+/i', trim($url));
}

function filter_string_list($values): array
{
    if (!is_array($values)) {
        return [];
    }

    return array_values(array_filter($values, static function ($value) {
        return is_string($value) && $value !== '';
    }));
}

function encode_json_list($values): string
{
    return json_encode(filter_string_list($values)) ?: '[]';
}

function normalize_youtube_url(string $url): string
{
    $raw = trim($url);
    if ($raw === '') {
        return '';
    }
    if (strpos($raw, 'youtube.com/embed/') !== false) {
        return $raw;
    }
    if (preg_match('/youtu\.be\/([^?&\/]+)/i', $raw, $match)) {
        return 'https://www.youtube.com/embed/' . $match[1];
    }
    if (preg_match('/[?&]v=([^?&\/]+)/i', $raw, $match)) {
        return 'https://www.youtube.com/embed/' . $match[1];
    }
    if (preg_match('/^https?:\/\//i', $raw)) {
        return $raw;
    }
    return 'https://' . ltrim($raw, '/');
}

function db_connect(array $cfg)
{
    if (($cfg['db_name'] ?? '') === '' || ($cfg['db_user'] ?? '') === '') {
        respond(['error' => 'Database config missing. Create public/api/config.php from example.'], 500);
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $cfg['db_host'],
        $cfg['db_port'],
        $cfg['db_name']
    );

    try {
        $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
    } catch (Throwable $error) {
        respond(['error' => 'Failed to connect to MySQL', 'details' => $error->getMessage()], 500);
    }

    return $pdo;
}

function map_content_row(array $row): array
{
    return [
        'id' => $row['id'],
        'type' => $row['type'],
        'title' => $row['title'],
        'authorName' => $row['author_name'] ?? 'Gaming With The Bard',
        'slug' => $row['slug'],
        'excerpt' => $row['excerpt'],
        'body' => $row['body'],
        'imageUrl' => $row['image_url'],
        'videoUrl' => $row['video_url'],
        'genres' => json_decode($row['genres_json'] ?? '[]', true) ?: [],
        'platforms' => json_decode($row['platforms_json'] ?? '[]', true) ?: [],
        'screenshots' => json_decode($row['screenshots_json'] ?? '[]', true) ?: [],
        'relatedGames' => json_decode($row['related_games_json'] ?? '[]', true) ?: [],
        'bardScore' => $row['bard_score'] !== null ? (float) $row['bard_score'] : null,
        'buildQuality' => $row['build_quality'] !== null ? (float) $row['build_quality'] : null,
        'respectsYourTime' => $row['respects_time'],
        'steamDeck' => (bool) ((int) ($row['steam_deck'] ?? 0)),
        'steamDeckFps' => $row['steam_deck_fps'] ?? '',
        'status' => $row['status'],
        'createdAt' => strtotime((string) $row['created_at']) * 1000
    ];
}

function require_write_token(array $cfg): void
{
    if (is_admin_authenticated()) {
        return;
    }

    $expected = (string) ($cfg['api_write_token'] ?? '');
    if ($expected === '') {
        $fallback = (string) ($cfg['admin_password'] ?? '');
        if ($fallback !== '') {
            respond(['error' => 'Unauthorized'], 401);
        }
        return;
    }

    $provided = $_SERVER['HTTP_X_API_TOKEN'] ?? '';
    if (!hash_equals($expected, (string) $provided)) {
        respond(['error' => 'Unauthorized'], 401);
    }
}

function start_session_if_needed(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function is_admin_authenticated(): bool
{
    start_session_if_needed();
    return !empty($_SESSION['gwtb_admin_authenticated']);
}

function require_admin_password(array $cfg, string $providedPassword): bool
{
    $expected = (string) ($cfg['admin_password'] ?? '');
    if ($expected === '') {
        $expected = (string) ($cfg['api_write_token'] ?? '');
    }
    return $expected !== '' && hash_equals($expected, $providedPassword);
}
