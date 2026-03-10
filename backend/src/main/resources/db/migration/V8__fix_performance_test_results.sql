-- 修复 performance_test_results 表结构
ALTER TABLE performance_test_results ALTER COLUMN test_config TYPE JSONB USING test_config::jsonb;
ALTER TABLE performance_test_results ALTER COLUMN test_result TYPE JSONB USING test_result::jsonb;
ALTER TABLE performance_test_results ALTER COLUMN test_config SET DEFAULT '{}'::jsonb;
ALTER TABLE performance_test_results ALTER COLUMN test_result SET DEFAULT '{}'::jsonb;
