# Database Setup - Implementation Summary

## Changes Made

### ✅ File 1: `setup.sql`

**Location:** `infrastructure/terraform/setup.sql`  
**Purpose:** Creates database user and grants permissions

**Changes:**

- Updated username from `banking_buddy_service` to `crm_user_service` (matches your dev.tfvars)
- Updated password to `crm_user_service_password` (matches your dev.tfvars)
- Creates user with least privilege access to all CRM databases

### ✅ File 2: `README-DATABASE-SETUP.md`

**Location:** `infrastructure/terraform/README-DATABASE-SETUP.md`  
**Purpose:** Complete guide for database setup

**Contents:**

- Architecture diagram
- Step-by-step instructions
- Troubleshooting guide
- Quick reference commands

### ✅ File 3: `setup-database.sh`

**Location:** `infrastructure/terraform/setup-database.sh`  
**Purpose:** Automated script to run database setup

**What it does:**

1. Gets RDS endpoint from Terraform
2. Runs setup.sql
3. Updates Secrets Manager
4. Verifies everything worked

## How to Use

### Option 1: Run the Automated Script (Recommended)

```bash
cd infrastructure/terraform

# Run the setup script
./setup-database.sh
```

**Note:** On Windows, use Git Bash or WSL to run this script.

### Option 2: Manual Steps

```bash
cd infrastructure/terraform

# Step 1: Get RDS endpoint
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)

# Step 2: Run setup
mysql -h $RDS_ENDPOINT -u admin -p'BankingBuddy2025!' < setup.sql

# Step 3: Update Secrets Manager
export CRM_SECRET_NAME=$(terraform output -raw crm_users_db_secret_name)
export RDS_HOST=$(echo $RDS_ENDPOINT | cut -d: -f1)

aws secretsmanager put-secret-value \
  --secret-id "$CRM_SECRET_NAME" \
  --secret-string "{\"username\":\"crm_user_service\",\"password\":\"crm_user_service_password\",\"engine\":\"mysql\",\"host\":\"$RDS_HOST\",\"port\":3306,\"dbname\":\"crm_users\"}"
```

## Verification

After running setup, verify with:

```bash
# Check user exists
mysql -h $RDS_ENDPOINT -u admin -p'BankingBuddy2025!' -e \
  "SELECT User, Host FROM mysql.user WHERE User='crm_user_service';"

# Check Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id $(terraform output -raw crm_users_db_secret_name) \
  --query SecretString \
  --output text
```

## When to Run This

**Run setup.sql when:**

- After initial `terraform apply`
- After `terraform destroy` followed by new `terraform apply`
- RDS instance is recreated

**DO NOT run setup.sql:**

- For normal application deployments
- For application code updates
- For infrastructure updates (unless RDS is recreated)

## Troubleshooting

### Issue: mysql command not found

**Solution:** Install MySQL client:

```bash
# On macOS
brew install mysql-client

# On Ubuntu/Debian
sudo apt-get install mysql-client

# On Windows
# Download from: https://dev.mysql.com/downloads/mysql/
```

### Issue: Cannot connect to RDS

**Solution:** Check security group allows your IP:

```bash
# Get your public IP
curl ifconfig.me

# Update security group to allow your IP
```

### Issue: Permission denied

**Solution:** Run with correct password from dev.tfvars:

```bash
mysql -h $RDS_ENDPOINT -u admin -p'BankingBuddy2025!' < setup.sql
```

## Next Steps

1. ✅ Run database setup (this guide)
2. Deploy user-service application
3. Test application health endpoint
4. Monitor CloudWatch logs

---
**Created:** 2025-01-23  
**Author:** Banking Buddy Team
