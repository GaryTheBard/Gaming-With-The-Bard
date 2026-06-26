<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

start_session_if_needed();
$_SESSION = [];
session_destroy();

respond(['authenticated' => false]);
