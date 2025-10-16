CREATE DATABASE IF NOT EXISTS crm_users;

USE crm_users;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY COMMENT 'Cognito sub (UUID)',
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('ADMIN', 'AGENT', 'ROOT_ADMIN') NOT NULL DEFAULT 'AGENT',
    status ENUM('PENDING', 'ACTIVE', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Root admin seed (cretaed during first deployment)
-- Root admin ID should be added after first Cognito user creation
