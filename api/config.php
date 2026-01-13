<?php
// api/config.php
// Safe config loader: reads local config outside git, falls back to env vars.

function get_cfg(): array {
  $local = __DIR__ . '/config.local.php';
  if (file_exists($local)) {
    $cfg = require $local;
    if (is_array($cfg)) return $cfg;
  }

  return [
    'db_host' => getenv('DB_HOST') ?: 'localhost',
    'db_name' => getenv('DB_NAME') ?: '',
    'db_user' => getenv('DB_USER') ?: '',
    'db_pass' => getenv('DB_PASS') ?: '',
    'app_key' => getenv('APP_KEY') ?: 'change_me',
    'token_ttl_minutes' => (int)(getenv('TOKEN_TTL_MINUTES') ?: 10080), // default 7 days
  ];
}

function db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  $cfg = get_cfg();
  if (!$cfg['db_name'] || !$cfg['db_user']) {
    throw new Exception("DB config is missing. Set api/config.local.php or env vars.");
  }

  $dsn = "mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset=utf8mb4";
  $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}

function app_cfg(string $key, $default=null) {
  $cfg = get_cfg();
  return $cfg[$key] ?? $default;
}
