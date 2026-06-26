<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

$cfg = load_config();
$data = read_json_body();
$password = (string) ($data['password'] ?? '');

if (!require_admin_password($cfg, $password)) {
    respond(['error' => 'Invalid credentials'], 401);
}

start_session_if_needed();
$_SESSION['gwtb_admin_authenticated'] = true;

respond(['authenticated' => true]);
