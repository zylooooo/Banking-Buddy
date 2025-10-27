#!/bin/bash
set -e  # Exit on any error

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/db-init.log
}

log "Starting CRM database initialization..."

# Retrieve RDS credentials from Secrets Manager
log "Retrieving RDS credentials from Secrets Manager..."
RDS_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id ${rds_secret_name} \
    --query SecretString \
    --output text)

RDS_USERNAME=$(echo $RDS_SECRET | jq -r '.username')
RDS_PASSWORD=$(echo $RDS_SECRET | jq -r '.password')
RDS_HOST=$(echo $RDS_SECRET | jq -r '.host')
RDS_PORT=$(echo $RDS_SECRET | jq -r '.port')

# Connect to MySQL and create database and user
log "Connecting to RDS MySQL instance..."
mysql -h $RDS_HOST -P $RDS_PORT -u $RDS_USERNAME -p$RDS_PASSWORD << EOF
-- Create CRM users database
CREATE DATABASE IF NOT EXISTS crm_users;

-- Create dedicated user for CRM database
CREATE USER IF NOT EXISTS '${crm_users_db_username}'@'%' IDENTIFIED BY '${crm_users_db_password}';

-- Grant privileges only on crm_users database
GRANT ALL PRIVILEGES ON crm_users.* TO '${crm_users_db_username}'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show databases to verify
SHOW DATABASES;
EOF

log "CRM database initialization completed successfully"