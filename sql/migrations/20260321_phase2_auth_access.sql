ALTER TABLE core.app_user
ADD COLUMN IF NOT EXISTS password_hash TEXT NULL;

ALTER TABLE core.app_user
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS ix_app_user_email
ON core.app_user(email);

