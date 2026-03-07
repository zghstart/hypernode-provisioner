CREATE TABLE IF NOT EXISTS data_centers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    http_proxy VARCHAR(500),
    https_proxy VARCHAR(500),
    apt_mirror VARCHAR(500),
    huggingface_mirror VARCHAR(500),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servers (
    id VARCHAR(255) PRIMARY KEY,
    ip_address VARCHAR(255) NOT NULL UNIQUE,
    ssh_port INTEGER DEFAULT 22,
    username VARCHAR(255) NOT NULL,
    password_encrypted VARCHAR(1000),
    private_key_encrypted VARCHAR(2000),
    data_center_id VARCHAR(255) REFERENCES data_centers(id),
    gpu_topology JSONB,
    status VARCHAR(50) NOT NULL,
    last_deployment_version VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS config_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    variables TEXT DEFAULT '{}',
    ansible_vars TEXT DEFAULT '{}',
    data_center_id VARCHAR(255) REFERENCES data_centers(id),
    version VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    server_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    logs JSONB,
    rollback_required BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    force_run BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_dc ON servers(data_center_id);
CREATE INDEX IF NOT EXISTS idx_tasks_server ON tasks(server_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_templates_dc ON config_templates(data_center_id);
