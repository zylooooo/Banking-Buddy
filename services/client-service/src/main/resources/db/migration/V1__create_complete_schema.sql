-- V1: Complete schema creation for Banking Buddy Client Service
-- Based on CLIENT_SERVICE_SPECIFICATION.md

-- Create clients table
CREATE TABLE clients (
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
    
    -- Unique Constraints (excluding soft-deleted)
    UNIQUE KEY uk_email_not_deleted (email, deleted),
    UNIQUE KEY uk_phone_not_deleted (phone_number, deleted),
    
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

-- Create accounts table
CREATE TABLE accounts (
    -- Primary Key
    account_id VARCHAR(255) PRIMARY KEY COMMENT 'UUID format: ACC-{UUID}',
    
    -- Foreign Key
    client_id VARCHAR(255) NOT NULL COMMENT 'Foreign key to clients.client_id',
    
    -- Account Information
    account_type ENUM('Savings', 'Checking', 'Business') NOT NULL,
    account_status ENUM('Active', 'Inactive', 'Pending') NOT NULL DEFAULT 'Pending',
    opening_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    initial_deposit DECIMAL(15, 2) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'SGD',
    branch_id VARCHAR(50) NOT NULL,
    
    -- Status Flag
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_client_id (client_id),
    INDEX idx_account_type (account_type),
    INDEX idx_account_status (account_status),
    INDEX idx_deleted (deleted),
    INDEX idx_opening_date (opening_date),
    INDEX idx_client_deleted (client_id, deleted),
    
    -- Foreign Key Constraint
    CONSTRAINT fk_accounts_client FOREIGN KEY (client_id) 
        REFERENCES clients(client_id) ON DELETE RESTRICT,
    
    -- Check Constraints
    CONSTRAINT chk_initial_deposit CHECK (initial_deposit > 0),
    CONSTRAINT chk_balance CHECK (balance >= 0),
    CONSTRAINT chk_branch_id_length CHECK (CHAR_LENGTH(branch_id) >= 3)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
