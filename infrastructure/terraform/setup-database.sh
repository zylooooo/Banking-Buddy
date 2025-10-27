#!/bin/bash
# Complete Database Setup Script for Banking Buddy CRM
# Run this after terraform apply

set -e  # Exit on error

echo "=========================================="
echo "Banking Buddy Database Setup"
echo "=========================================="

# Step 1: Navigate to terraform directory
cd "$(dirname "$0")"
echo "✓ Changed to terraform directory"

# Step 2: Get RDS endpoint
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
echo "✓ RDS Endpoint: $RDS_ENDPOINT"

# Step 3: Set master password
RDS_PASSWORD="BankingBuddy2025!"
echo "✓ Using master password"

# Step 4: Run setup script
echo ""
echo "Running database setup script..."
mysql -h $RDS_ENDPOINT \
      -u admin \
      -p"$RDS_PASSWORD" \
      < setup.sql

if [ $? -eq 0 ]; then
    echo "✓ Database setup completed successfully"
else
    echo "✗ Database setup failed"
    exit 1
fi

# Step 5: Get secret name
CRM_SECRET_NAME=$(terraform output -raw crm_users_db_secret_name)
echo "✓ Secret Name: $CRM_SECRET_NAME"

# Step 6: Extract RDS host
RDS_HOST=$(echo $RDS_ENDPOINT | cut -d: -f1)
echo "✓ RDS Host: $RDS_HOST"

# Step 7: Update Secrets Manager
echo ""
echo "Updating Secrets Manager..."
aws secretsmanager put-secret-value \
  --secret-id "$CRM_SECRET_NAME" \
  --secret-string "{\"username\":\"crm_user_service\",\"password\":\"crm_user_service_password\",\"engine\":\"mysql\",\"host\":\"$RDS_HOST\",\"port\":3306,\"dbname\":\"crm_users\"}"

if [ $? -eq 0 ]; then
    echo "✓ Secrets Manager updated successfully"
else
    echo "✗ Secrets Manager update failed"
    exit 1
fi

# Step 8: Verify
echo ""
echo "Verifying setup..."

# Verify user exists
echo "Checking database user..."
mysql -h $RDS_ENDPOINT -u admin -p"$RDS_PASSWORD" -e \
  "SELECT User, Host FROM mysql.user WHERE User='crm_user_service';" \
  2>/dev/null

echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Deploy user-service: cd ../../services/user-service && mvn clean package"
echo "2. Test connection to verify credentials work"
echo ""

