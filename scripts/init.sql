-- OSHI-HIGH Local Development Database Initialization

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Sample tables (to be replaced with actual schema)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS idols (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email) VALUES ('dev_user', 'dev@oshi-high.local') ON CONFLICT DO NOTHING;
INSERT INTO idols (name, bio) VALUES ('Sample Idol', 'Development sample idol') ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO oshi_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO oshi_user;
