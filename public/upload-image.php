<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . '_bootstrap.php';
$cfg = load_config();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_write_token($cfg);

if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing image upload']);
    exit;
}

$file = $_FILES['image'];

if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Upload failed with code ' . (string) ($file['error'] ?? 'unknown')]);
    exit;
}

$maxBytes = 8 * 1024 * 1024; // 8MB
if (($file['size'] ?? 0) > $maxBytes) {
    http_response_code(413);
    echo json_encode(['error' => 'File too large. Max size is 8MB.']);
    exit;
}

$tmpPath = $file['tmp_name'] ?? '';
if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid upload payload']);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($tmpPath);

$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif'
];

if (!isset($allowed[$mime])) {
    http_response_code(415);
    echo json_encode(['error' => 'Unsupported file type']);
    exit;
}

$ext = $allowed[$mime];
$safeName = bin2hex(random_bytes(12)) . '.' . $ext;
$subDir = date('Y/m');
$uploadRoot = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
$targetDir = $uploadRoot . DIRECTORY_SEPARATOR . $subDir;

if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create upload directory']);
    exit;
}

$targetPath = $targetDir . DIRECTORY_SEPARATOR . $safeName;

if (!move_uploaded_file($tmpPath, $targetPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file']);
    exit;
}

$isHttps = (
    (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
    (($_SERVER['SERVER_PORT'] ?? '') === '443')
);
$scheme = $isHttps ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
$publicPath = ($basePath === '' ? '' : $basePath) . '/uploads/' . $subDir . '/' . $safeName;
$url = $scheme . '://' . $host . $publicPath;

echo json_encode([
    'success' => true,
    'url' => $url
]);
