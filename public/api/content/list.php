<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();
$conn = db_connect($cfg);

$status = $_GET['status'] ?? 'published';
$statusSql = ($status === 'all') ? null : $status;

$sql = 'SELECT * FROM content';
if ($statusSql !== null) {
    $sql .= ' WHERE status = :status';
}
$sql .= ' ORDER BY created_at DESC';

try {
    $statement = $conn->prepare($sql);
    if ($statusSql !== null) {
        $statement->bindValue(':status', $statusSql, PDO::PARAM_STR);
    }
    $statement->execute();
    $rows = $statement->fetchAll();
} catch (Throwable $error) {
    respond(['error' => 'Query failed', 'details' => $error->getMessage()], 500);
}

$items = array_map('map_content_row', $rows);
respond(['items' => $items]);
