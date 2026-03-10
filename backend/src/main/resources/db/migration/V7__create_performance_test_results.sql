CREATE TABLE IF NOT EXISTS performance_test_results (
    id VARCHAR(255) PRIMARY KEY,
    server_id VARCHAR(255) NOT NULL REFERENCES servers(id),
    test_type VARCHAR(100) NOT NULL,
    test_config JSONB DEFAULT '{}',
    test_result JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_test_results_server ON performance_test_results(server_id);
CREATE INDEX IF NOT EXISTS idx_performance_test_results_type ON performance_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_performance_test_results_status ON performance_test_results(status);
