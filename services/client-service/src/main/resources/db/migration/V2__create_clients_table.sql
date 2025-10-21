-- Create clients table with all required fields and constraints

CREATE TABLE IF NOT EXISTS clients (
    client_id VARCHAR(50) NOT NULL PRIMARY KEY COMMENT 'Client ID in format CLT-UUID',
    first_name VARCHAR(100) NOT NULL COMMENT 'Client first name',
    last_name VARCHAR(100) NOT NULL COMMENT 'Client last name',
    date_of_birth DATE NOT NULL COMMENT 'Client date of birth',
    age INT NOT NULL COMMENT 'Client age (18-100)',
    gender ENUM('Male', 'Female', 'Non_binary', 'Prefer_not_to_say') NOT NULL COMMENT 'Client gender',
    email VARCHAR(255) NOT NULL COMMENT 'Client email address',
    phone_number VARCHAR(15) NOT NULL COMMENT 'Client phone number with country code (digits only)',
    address VARCHAR(255) NOT NULL COMMENT 'Client street address',
    city VARCHAR(100) NOT NULL COMMENT 'Client city',
    state VARCHAR(100) NOT NULL COMMENT 'Client state/province',
    postal_code VARCHAR(20) NOT NULL COMMENT 'Client postal/zip code',
    country VARCHAR(100) NOT NULL COMMENT 'Client country',
    account_type ENUM('Savings', 'Checking', 'Business') NOT NULL COMMENT 'Type of account',
    account_status ENUM('Active', 'Inactive', 'Pending') NOT NULL COMMENT 'Status of account',
    agent_id VARCHAR(50) NOT NULL COMMENT 'ID of agent who created this client',
    notes TEXT COMMENT 'Additional notes about the client',
    deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Soft delete flag',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
    
    -- Unique constraints: email and phone must be unique among non-deleted records
    CONSTRAINT uk_email_not_deleted UNIQUE (email, deleted),
    CONSTRAINT uk_phone_not_deleted UNIQUE (phone_number, deleted),
    
    -- Check constraints
    CONSTRAINT chk_age_range CHECK (age >= 18 AND age <= 100),
    CONSTRAINT chk_first_name_length CHECK (CHAR_LENGTH(first_name) >= 1 AND CHAR_LENGTH(first_name) <= 100),
    CONSTRAINT chk_last_name_length CHECK (CHAR_LENGTH(last_name) >= 1 AND CHAR_LENGTH(last_name) <= 100),
    CONSTRAINT chk_email_length CHECK (CHAR_LENGTH(email) <= 255),
    CONSTRAINT chk_phone_length CHECK (CHAR_LENGTH(phone_number) >= 10 AND CHAR_LENGTH(phone_number) <= 15),
    CONSTRAINT chk_address_length CHECK (CHAR_LENGTH(address) <= 255),
    CONSTRAINT chk_city_length CHECK (CHAR_LENGTH(city) <= 100),
    CONSTRAINT chk_state_length CHECK (CHAR_LENGTH(state) <= 100),
    CONSTRAINT chk_postal_code_length CHECK (CHAR_LENGTH(postal_code) <= 20),
    CONSTRAINT chk_country_length CHECK (CHAR_LENGTH(country) <= 100),
    
    -- Indexes for performance
    INDEX idx_agent_id (agent_id),
    INDEX idx_email (email),
    INDEX idx_phone_number (phone_number),
    INDEX idx_deleted (deleted),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Client profiles managed by agents';
-- This file will be replaced with full schema
