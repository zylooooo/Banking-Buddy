# Database Setup Guide for Banking Buddy CRM

## Overview

This guide explains the manual database setup step required after provisioning infrastructure with Terraform. This is a **one-time step** per RDS instance creation.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│          Phase 1: Automated (Terraform)                     │
├─────────────────────────────────────────────────────────────┤
│  • RDS Instance Creation                                     │
│  • Secrets Manager (Secrets created)                        │
│  • IAM Roles & Policies                                      │
│  • Security Groups                                           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│     Phase 2: Manual Step (THIS GUIDE - Run Once)            │
├─────────────────────────────────────────────────────────────┤
│  • Create Database User                                      │
│  • Grant Permissions                                         │
│  • Update Secrets Manager with actual credentials           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│         Phase 3: Automated (Application)                     │
├─────────────────────────────────────────────────────────────┤
│  • Retrieve Credentials from Secrets Manager                │
│  • Connect to Database                                      │
│  • Run Flyway Migrations                                    │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Terraform infrastructure deployed
- `mysql` client installed on your machine
- AWS CLI configured
- Access to your `dev.tfvars` file

## Step-by-Step Instructions

### Step 1: Deploy Infrastructure

```bash
cd infrastructure/terraform

# Initialize Terraform (first time only)
terraform init

# Review the plan
terraform plan -var-file="environments/dev.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/dev.tfvars"
```

### Step 2: Get RDS Connection Details

```bash
cd infrastructure/terraform

# Get RDS endpoint
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
echo "RDS Endpoint: $RDS_ENDPOINT"

# Get master password from dev.tfvars
export RDS_PASSWORD="BankingBuddy2025!"
```

### Step 3: Run Database Setup Script

```bash
# Navigate to terraform directory
cd infrastructure/terraform

# Run the setup script
mysql -h $RDS_ENDPOINT \
      -u admin \
      -p"$RDS_PASSWORD" \
      < setup.sql
```

Expected Output:

```text
+------------------------------------------------------+
| status                                               |
+------------------------------------------------------+
| ✓ Database users created successfully                |
+------------------------------------------------------+
```

### Step 4: Update Secrets Manager

```bash
# Get the secret name and RDS host
export CRM_SECRET_NAME=$(terraform output -raw crm_users_db_secret_name)
export RDS_HOST=$(echo $RDS_ENDPOINT | cut -d: -f1)

echo "Secret Name: $CRM_SECRET_NAME"

# Update the secret with actual credentials
aws secretsmanager put-secret-value \
  --secret-id "$CRM_SECRET_NAME" \
  --secret-string "{\"username\":\"crm_user_service\",\"password\":\"crm_user_service_password\",\"engine\":\"mysql\",\"host\":\"$RDS_HOST\",\"port\":3306,\"dbname\":\"crm_users\"}"

echo "✓ Secrets Manager updated successfully"
```

### Step 5: Verify Configuration

```bash
# Test 1: Verify database user exists
mysql -h $RDS_ENDPOINT -u admin -p"$RDS_PASSWORD" -e \
  "SELECT User, Host FROM mysql.user WHERE User='crm_user_service';"

# Test 2: Verify Secrets Manager has correct credentials
aws secretsmanager get-secret-value \
  --secret-id "$CRM_SECRET_NAME" \
  --query SecretString \
  --output text

# Test 3: Test connection with service user
mysql -h $RDS_ENDPOINT \
      -u crm_user_service \
      -p'crm_user_service_password' \
      -e "SHOW DATABASES;"
```

## Quick Reference

```bash
# Get RDS endpoint
terraform output -raw rds_endpoint

# Get secret name
terraform output -raw crm_users_db_secret_name

# Run setup
mysql -h $(terraform output -raw rds_endpoint) -u admin -p < setup.sql

# Update secret
aws secretsmanager put-secret-value --secret-id <name> --secret-string "<json>"
```

## When to Re-run Setup

Run setup.sql again when:

- You run `terraform destroy` followed by new `terraform apply`
- RDS instance is recreated for any reason

DO NOT run setup.sql for:

- Normal application deployments
- Application code updates
- Infrastructure updates (unless RDS is recreated)

## Troubleshooting

### Issue: "Access denied for user"

Solution: Re-run setup.sql

```bash
mysql -h $RDS_ENDPOINT -u admin -p"$RDS_PASSWORD" < setup.sql
```

### Issue: "Cannot connect to MySQL server"

Check security group configuration:

```bash
terraform output -json | jq '.security_groups'
```

### Issue: "Secret not found"

List secrets:

```bash
aws secretsmanager list-secrets \
  --query "SecretList[?starts_with(Name, 'banking-buddy-dev')].{Name:Name}"
```

## Related Documentation

- [AWS RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
- [MySQL User Management](https://dev.mysql.com/doc/refman/8.0/en/user-management.html)

---
**Last Updated:** 2025-01-23  
**Version:** 1.0
