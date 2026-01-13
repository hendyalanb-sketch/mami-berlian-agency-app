-- AUTH TOKENS TABLE
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at),
  CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OPTIONAL: enforce one active token per user (comment out if you want multiple sessions)
-- CREATE UNIQUE INDEX uq_auth_tokens_user_active ON auth_tokens(user_id, revoked_at);

-- SEED OWNER USER (update email/phone as needed)
-- IMPORTANT: Replace {PASSWORD_HASH} with output of PHP password_hash('YourPassword', PASSWORD_DEFAULT)
-- Example: you can generate in PHP: <?php echo password_hash("YourPassword", PASSWORD_DEFAULT);
INSERT INTO users (name, phone, email, password_hash, role_id, status)
SELECT
  'Owner Mami Berlian' AS name,
  '08XXXXXXXXXX' AS phone,
  'owner@mamiberlian.local' AS email,
  '{PASSWORD_HASH}' AS password_hash,
  r.id AS role_id,
  'ACTIVE' AS status
FROM roles r
WHERE r.name = 'OWNER'
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'owner@mamiberlian.local');