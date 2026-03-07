ALTER TABLE servers ADD COLUMN IF NOT EXISTS connect_status VARCHAR(20) DEFAULT 'UNKNOWN';
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS system_specs JSONB;

CREATE INDEX IF NOT EXISTS idx_servers_connect_status ON servers(connect_status);
