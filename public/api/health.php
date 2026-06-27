<?php
declare(strict_types=1);

require_once __DIR__ . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();

try {
    $conn = db_connect($cfg);
    $statement = $conn->query('SELECT COUNT(*) AS total FROM content');
    $row = $statement ? $statement->fetch() : ['total' => 0];
    $published = $conn->query("SELECT COUNT(*) AS total FROM content WHERE status = 'published'");
    $publishedRow = $published ? $published->fetch() : ['total' => 0];

    $mapOk = false;
    $mapError = null;
    $sample = $conn->query('SELECT * FROM content ORDER BY created_at DESC LIMIT 1');
    $sampleRow = $sample ? $sample->fetch() : false;
    if ($sampleRow) {
        try {
            map_content_row($sampleRow);
            $mapOk = true;
        } catch (Throwable $error) {
            $mapError = $error->getMessage();
        }
    }

    respond([
        'ok' => true,
        'phpVersion' => PHP_VERSION,
        'dbConnected' => true,
        'contentTotal' => (int) ($row['total'] ?? 0),
        'publishedTotal' => (int) ($publishedRow['total'] ?? 0),
        'mapOk' => $mapOk,
        'mapError' => $mapError
    ]);
} catch (Throwable $error) {
    respond([
        'ok' => false,
        'phpVersion' => PHP_VERSION,
        'error' => $error->getMessage()
    ], 500);
}
