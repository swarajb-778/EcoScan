-- PostgreSQL initialization for EcoScan database

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema
CREATE SCHEMA IF NOT EXISTS ecoscan;

-- Set search path
SET search_path TO ecoscan, public;

-- Create user roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ecoscan_api') THEN
        CREATE ROLE ecoscan_api LOGIN PASSWORD 'api_password';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ecoscan_readonly') THEN
        CREATE ROLE ecoscan_readonly LOGIN PASSWORD 'readonly_password';
    END IF;
END
$$;

-- Create tables
CREATE TABLE IF NOT EXISTS detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    image_hash VARCHAR(64),
    image_path VARCHAR(255),
    model_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processing_time FLOAT,
    device_info JSONB,
    location_data JSONB,
    confidence_threshold FLOAT NOT NULL DEFAULT 0.5
);

CREATE TABLE IF NOT EXISTS detection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detection_id UUID NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    bbox JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detection_item_id UUID NOT NULL REFERENCES detection_items(id) ON DELETE CASCADE,
    user_correction VARCHAR(255),
    confidence_rating FLOAT,
    was_helpful BOOLEAN,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    device_type VARCHAR(50),
    cpu_cores INT,
    memory_mb INT,
    gpu_info VARCHAR(255),
    inference_time_ms FLOAT,
    preprocessing_time_ms FLOAT,
    postprocessing_time_ms FLOAT,
    detected_objects INT,
    input_resolution VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    session_id UUID NOT NULL,
    feature_used VARCHAR(50) NOT NULL,
    duration_seconds INT,
    success BOOLEAN,
    error_message TEXT,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS environmental_impact (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    waste_type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    carbon_savings_grams FLOAT,
    water_savings_liters FLOAT,
    landfill_reduction_grams FLOAT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_detections_user_id ON detections(user_id);
CREATE INDEX IF NOT EXISTS idx_detections_created_at ON detections(created_at);
CREATE INDEX IF NOT EXISTS idx_detection_items_detection_id ON detection_items(detection_id);
CREATE INDEX IF NOT EXISTS idx_detection_items_category ON detection_items(category);
CREATE INDEX IF NOT EXISTS idx_user_feedback_detection_item_id ON user_feedback(detection_item_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_model_version ON performance_metrics(model_version);
CREATE INDEX IF NOT EXISTS idx_app_usage_user_id ON app_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_environmental_impact_waste_type ON environmental_impact(waste_type);

-- Create GIN index for JSON fields
CREATE INDEX IF NOT EXISTS idx_detections_device_info ON detections USING GIN (device_info);

-- Create triggers for automatic timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column and trigger to tables
DO $$
BEGIN
    -- Add updated_at column to tables that don't have it
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'ecoscan' AND table_name = 'detections' AND column_name = 'updated_at') THEN
        ALTER TABLE detections ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
        UPDATE detections SET updated_at = created_at;
        ALTER TABLE detections ALTER COLUMN updated_at SET NOT NULL;
        
        CREATE TRIGGER update_detections_timestamp BEFORE UPDATE ON detections
        FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
    
    -- Repeat for other tables
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'ecoscan' AND table_name = 'detection_items' AND column_name = 'updated_at') THEN
        ALTER TABLE detection_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
        UPDATE detection_items SET updated_at = created_at;
        ALTER TABLE detection_items ALTER COLUMN updated_at SET NOT NULL;
        
        CREATE TRIGGER update_detection_items_timestamp BEFORE UPDATE ON detection_items
        FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'ecoscan' AND table_name = 'user_feedback' AND column_name = 'updated_at') THEN
        ALTER TABLE user_feedback ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
        UPDATE user_feedback SET updated_at = created_at;
        ALTER TABLE user_feedback ALTER COLUMN updated_at SET NOT NULL;
        
        CREATE TRIGGER update_user_feedback_timestamp BEFORE UPDATE ON user_feedback
        FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
END
$$;

-- Grant privileges
GRANT USAGE ON SCHEMA ecoscan TO ecoscan_api, ecoscan_readonly;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ecoscan TO ecoscan_api;
GRANT SELECT ON ALL TABLES IN SCHEMA ecoscan TO ecoscan_readonly;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ecoscan TO ecoscan_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ecoscan TO ecoscan_readonly;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA ecoscan
GRANT SELECT, INSERT, UPDATE ON TABLES TO ecoscan_api;

ALTER DEFAULT PRIVILEGES IN SCHEMA ecoscan
GRANT SELECT ON TABLES TO ecoscan_readonly;

-- Create views for analytics
CREATE OR REPLACE VIEW detection_stats AS
SELECT 
    date_trunc('day', d.created_at) AS detection_date,
    COUNT(DISTINCT d.id) AS total_detections,
    COUNT(DISTINCT d.user_id) AS unique_users,
    AVG(d.processing_time) AS avg_processing_time,
    COUNT(di.id) AS total_items,
    COUNT(CASE WHEN di.category = 'recycle' THEN 1 END) AS recyclable_items,
    COUNT(CASE WHEN di.category = 'compost' THEN 1 END) AS compostable_items,
    COUNT(CASE WHEN di.category = 'landfill' THEN 1 END) AS landfill_items,
    COUNT(CASE WHEN di.category = 'hazardous' THEN 1 END) AS hazardous_items
FROM 
    detections d
LEFT JOIN 
    detection_items di ON d.id = di.detection_id
GROUP BY 
    detection_date
ORDER BY 
    detection_date;

-- Insert initial sample data
INSERT INTO detections (user_id, model_version, processing_time, confidence_threshold)
VALUES 
    ('test_user', 'yolov8n-1.0', 120.5, 0.5),
    ('test_user', 'yolov8n-1.0', 118.2, 0.5)
ON CONFLICT DO NOTHING;

-- Insert detection items
WITH detection_ids AS (
    SELECT id FROM detections WHERE user_id = 'test_user' LIMIT 2
)
INSERT INTO detection_items (detection_id, label, category, confidence, bbox)
SELECT 
    (SELECT id FROM detection_ids LIMIT 1 OFFSET 0),
    'Plastic Bottle',
    'recycle',
    0.92,
    '{"x": 100, "y": 50, "width": 100, "height": 250}'
ON CONFLICT DO NOTHING;

WITH detection_ids AS (
    SELECT id FROM detections WHERE user_id = 'test_user' LIMIT 2
)
INSERT INTO detection_items (detection_id, label, category, confidence, bbox)
SELECT 
    (SELECT id FROM detection_ids LIMIT 1 OFFSET 1),
    'Apple Core',
    'compost',
    0.87,
    '{"x": 300, "y": 100, "width": 150, "height": 150}'
ON CONFLICT DO NOTHING; 