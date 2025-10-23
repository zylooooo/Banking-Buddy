-- Transaction data storage for CRM services consumption

CREATE DATABASE IF NOT EXISTS crm_transactions
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE crm_transactions;

-- Core transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY COMMENT 'Unique transaction ID',
    client_id VARCHAR(50) NOT NULL COMMENT 'Unique client ID',
    transaction ENUM('Deposit', 'Withdrawal'),
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL COMMENT 'The Transaction Date',
    status ENUM('Completed', 'Pending', 'Failed') NOT NULL,

    -- Indexes 
    INDEX idx_client_id (client_id),
    INDEX idx_date (date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COMMENT='Transaction table for CRM services consumption';