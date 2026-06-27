<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

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

function sanitize_for_json($value)
{
    if (is_array($value)) {
        $clean = [];
        foreach ($value as $key => $item) {
            $clean[$key] = sanitize_for_json($item);
        }
        return $clean;
    }

    if (is_string($value) && function_exists('mb_convert_encoding')) {
        return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
    }

    return $value;
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    $json = json_encode(sanitize_for_json($payload));
    if ($json === false) {
        http_response_code(500);
        echo json_encode([
            'error' => 'JSON encode failed',
            'details' => json_last_error_msg()
        ]);
        exit;
    }
    echo $json;
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

function row_value(array $row, string $key, $default = null)
{
    return array_key_exists($key, $row) ? $row[$key] : $default;
}

function row_json_list(array $row, string $key): array
{
    $raw = row_value($row, $key, '[]');
    if (is_array($raw)) {
        return $raw;
    }
    $decoded = json_decode((string) $raw, true);
    return is_array($decoded) ? $decoded : [];
}

function row_float(array $row, string $key)
{
    $value = row_value($row, $key);
    if ($value === null || $value === '') {
        return null;
    }
    return (float) $value;
}

function row_timestamp_ms(array $row, string $key)
{
    $value = row_value($row, $key);
    if ($value === null || $value === '') {
        return 0;
    }
    $parsed = strtotime((string) $value);
    return $parsed !== false ? $parsed * 1000 : 0;
}

function map_content_row(array $row): array
{
    $createdAt = row_timestamp_ms($row, 'created_at');

    return [
        'id' => row_value($row, 'id'),
        'type' => row_value($row, 'type'),
        'title' => row_value($row, 'title'),
        'authorName' => row_value($row, 'author_name', 'Gaming With The Bard'),
        'slug' => row_value($row, 'slug'),
        'excerpt' => row_value($row, 'excerpt', ''),
        'body' => row_value($row, 'body', ''),
        'imageUrl' => row_value($row, 'image_url'),
        'videoUrl' => row_value($row, 'video_url'),
        'genres' => row_json_list($row, 'genres_json'),
        'platforms' => row_json_list($row, 'platforms_json'),
        'screenshots' => row_json_list($row, 'screenshots_json'),
        'relatedGames' => row_json_list($row, 'related_games_json'),
        'bardScore' => row_float($row, 'bard_score'),
        'buildQuality' => row_float($row, 'build_quality'),
        'respectsYourTime' => row_value($row, 'respects_time'),
        'steamDeck' => (bool) ((int) row_value($row, 'steam_deck', 0)),
        'steamDeckFps' => (string) row_value($row, 'steam_deck_fps', ''),
        'status' => row_value($row, 'status', 'published'),
        'createdAt' => $createdAt,
        'publishedAt' => row_timestamp_ms($row, 'published_at') ?: $createdAt
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
