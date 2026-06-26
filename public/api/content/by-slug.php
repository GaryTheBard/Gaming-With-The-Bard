<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();
$conn = db_connect($cfg);

$slug = trim((string) ($_GET['slug'] ?? ''));
if ($slug === '') {
    respond(['error' => 'Missing slug'], 400);
}

try {
    $statement = $conn->prepare('SELECT * FROM content WHERE slug = :slug LIMIT 1');
    $statement->bindValue(':slug', $slug, PDO::PARAM_STR);
    $statement->execute();
    $row = $statement->fetch();
} catch (Throwable $error) {
    respond(['error' => 'Query failed', 'details' => $error->getMessage()], 500);
}

if (!$row) {
    respond(['error' => 'Not found'], 404);
}

respond(['item' => map_content_row($row)]);
