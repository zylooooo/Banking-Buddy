-- V1: Create clients table for Banking Buddy Client Service
-- Based on CLIENT_SERVICE_SPECIFICATION.md
-- This is the first atomic migration - creates the clients table

CREATE TABLE IF NOT EXISTS clients (
    -- Primary Key
    client_id VARCHAR(255) PRIMARY KEY COMMENT 'UUID format: CLT-{UUID}',
    
    -- Foreign Key (Immutable)
    agent_id VARCHAR(255) NOT NULL COMMENT 'Foreign key to users.id in crm_users database',
    
    -- Personal Information
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Non_binary', 'Prefer_not_to_say') NOT NULL,
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    
    -- Address Information
    address VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'Singapore',
    postal_code VARCHAR(10) NOT NULL,
    
    -- Status Flags
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Generated columns for conditional unique constraints
    -- These are NULL for deleted clients, allowing multiple soft-deleted records with same email/phone
    email_if_active VARCHAR(255) AS (IF(deleted = FALSE, email, NULL)) STORED,
    phone_if_active VARCHAR(15) AS (IF(deleted = FALSE, phone_number, NULL)) STORED,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_agent_id (agent_id),
    INDEX idx_email (email),
    INDEX idx_phone (phone_number),
    INDEX idx_deleted (deleted),
    INDEX idx_verified (verified),
    INDEX idx_agent_deleted (agent_id, deleted),
    
    -- Unique constraints on generated columns (enforces uniqueness only for active clients)
    -- NULL values are ignored by UNIQUE constraints, so soft-deleted clients can have duplicate emails/phones
    UNIQUE KEY uk_email_active (email_if_active),
    UNIQUE KEY uk_phone_active (phone_if_active),
    
    -- Check Constraints (Note: Age validation handled at application layer due to MySQL CHECK constraint limitations with CURDATE())
    CONSTRAINT chk_first_name_length CHECK (CHAR_LENGTH(first_name) >= 2 AND CHAR_LENGTH(first_name) <= 50),
    CONSTRAINT chk_last_name_length CHECK (CHAR_LENGTH(last_name) >= 2 AND CHAR_LENGTH(last_name) <= 50),
    CONSTRAINT chk_address_length CHECK (CHAR_LENGTH(address) >= 5 AND CHAR_LENGTH(address) <= 100),
    CONSTRAINT chk_city_length CHECK (CHAR_LENGTH(city) >= 2 AND CHAR_LENGTH(city) <= 50),
    CONSTRAINT chk_state_length CHECK (CHAR_LENGTH(state) >= 2 AND CHAR_LENGTH(state) <= 50),
    CONSTRAINT chk_country_length CHECK (CHAR_LENGTH(country) >= 2 AND CHAR_LENGTH(country) <= 50),
    CONSTRAINT chk_postal_code_length CHECK (CHAR_LENGTH(postal_code) >= 4 AND CHAR_LENGTH(postal_code) <= 10),
    CONSTRAINT chk_phone_length CHECK (CHAR_LENGTH(phone_number) >= 10 AND CHAR_LENGTH(phone_number) <= 15)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

