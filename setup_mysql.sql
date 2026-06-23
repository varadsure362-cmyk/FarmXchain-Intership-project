-- FarmXchain MySQL Database Setup Script
-- Run this with: mysql -u root -p < setup_mysql.sql

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS farmex
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Grant all privileges to root (matching application.properties)
GRANT ALL PRIVILEGES ON farmex.* TO 'root'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify setup
SELECT 'Database and user setup complete!' as Status;
SELECT user FROM mysql.user WHERE user='varad';
