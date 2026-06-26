<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

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
        'db_port' => getenv('DB_PORT') ?: '5432',
        'db_name' => getenv('DB_NAME') ?: '',
        'db_user' => getenv('DB_USER') ?: '',
        'db_password' => getenv('DB_PASSWORD') ?: '',
        'api_write_token' => getenv('API_WRITE_TOKEN') ?: ''
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

function db_connect(array $cfg)
{
    if (($cfg['db_name'] ?? '') === '' || ($cfg['db_user'] ?? '') === '') {
        respond(['error' => 'Database config missing. Create public/api/config.php from example.'], 500);
    }

    $connString = sprintf(
        'host=%s port=%s dbname=%s user=%s password=%s',
        $cfg['db_host'],
        $cfg['db_port'],
        $cfg['db_name'],
        $cfg['db_user'],
        $cfg['db_password']
    );

    $conn = @pg_connect($connString);
    if (!$conn) {
        respond(['error' => 'Failed to connect to Postgres'], 500);
    }
    return $conn;
}

function require_write_token(array $cfg): void
{
    $expected = (string) ($cfg['api_write_token'] ?? '');
    if ($expected === '') {
        return;
    }

    $provided = $_SERVER['HTTP_X_API_TOKEN'] ?? '';
    if (!hash_equals($expected, (string) $provided)) {
        respond(['error' => 'Unauthorized'], 401);
    }
}
