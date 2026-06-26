<?php
declare(strict_types=1);

require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . '_bootstrap.php';

respond([
    'authenticated' => is_admin_authenticated()
]);
