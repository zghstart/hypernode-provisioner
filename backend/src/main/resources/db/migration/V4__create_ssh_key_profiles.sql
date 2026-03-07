CREATE TABLE IF NOT EXISTS ssh_key_profiles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    private_key_encrypted VARCHAR(2000) NOT NULL,
    fingerprint VARCHAR(100),
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

ALTER TABLE servers ADD COLUMN IF NOT EXISTS ssh_key_profile_id VARCHAR(255) REFERENCES ssh_key_profiles(id);
CREATE INDEX IF NOT EXISTS idx_servers_key_profile ON servers(ssh_key_profile_id);
