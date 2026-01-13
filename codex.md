# Codex Instructions – mami-berlian-agency-app

## Target Hosting
- cPanel shared hosting
- PHP 8.x backend
- MySQL/MariaDB
- No Node backend

## Repository Structure
- Backend API: /api
- Frontend build output: /app (static)
- Upload directory: /uploads (must not be publicly accessible directly; download via API)

## Response Format
- Success: { "data": ... }
- Error: { "error": { "code": "...", "message": "..." } }

## Security Rules
- Password must be hashed (bcrypt/argon2)
- Token must expire
- RBAC required for protected endpoints
- Upload endpoints must validate mime/size/ext

## Must Respect
- SPEC.md, API_CONTRACT.md, DB_SCHEMA.sql, ACCEPTANCE_TESTS.md are the source of truth.
