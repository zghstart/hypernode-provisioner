CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(100) NOT NULL DEFAULT 'system',
    ip_address VARCHAR(45) DEFAULT 'unknown',
    details TEXT DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
