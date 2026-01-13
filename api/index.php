<?php
// api/index.php - simple router
header('Content-Type: application/json; charset=utf-8');

$path = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

require_once __DIR__ . '/config.php';

function json_ok($data) {
  echo json_encode(["data" => $data], JSON_UNESCAPED_UNICODE);
  exit;
}

function json_err($code, $message, $http=400) {
  http_response_code($http);
  echo json_encode(["error" => ["code" => $code, "message" => $message]], JSON_UNESCAPED_UNICODE);
  exit;
}

$base = '/api/';
$pos = strpos($path, $base);
if ($pos === false) json_err("NOT_FOUND", "Invalid API base path", 404);

$route = substr($path, $pos + strlen($base)); // e.g. v1/auth/login
$route = explode('?', $route)[0];
$route = trim($route, '/');

if ($route === 'v1/auth/login' && $method === 'POST') {
  require __DIR__ . '/v1/auth_login.php';
  exit;
}

if ($route === 'v1/me' && $method === 'GET') {
  require __DIR__ . '/v1/me.php';
  exit;
}

json_err("NOT_FOUND", "Endpoint not found", 404);
