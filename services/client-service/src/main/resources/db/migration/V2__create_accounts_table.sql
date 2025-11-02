-- V2: Create accounts table for Banking Buddy Client Service
-- This migration depends on V1 (clients table must exist)
-- This is the second atomic migration - creates the accounts table with foreign key to clients

CREATE TABLE IF NOT EXISTS accounts (
    -- Primary Key
    account_id VARCHAR(255) PRIMARY KEY COMMENT 'UUID format: ACC-{UUID}',
    
    -- Foreign Key
    client_id VARCHAR(255) NOT NULL COMMENT 'Foreign key to clients.client_id',
    
    -- Account Information
    account_type ENUM('Savings', 'Checking', 'Business') NOT NULL,
    account_status ENUM('Active', 'Inactive', 'Pending') NOT NULL DEFAULT 'Pending',
    opening_date DATE NOT NULL DEFAULT (CURDATE()),
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

