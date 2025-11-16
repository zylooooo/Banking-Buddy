# Banking Buddy

> **A production-ready Customer Relationship Management (CRM) system for banking operations**  
> CS301 Coursework Project | Single-staged deployment mimicking production environment

---

## Overview

Banking Buddy is a microservices-based CRM system designed for banking operations. It enables agents to manage client profiles, bank accounts, and transactions with secure role-based access control. The system is built on AWS cloud infrastructure using Infrastructure as Code (Terraform) and follows production-grade best practices.

### Key Features

- **User Management**: Three-tier role system (ROOT_ADMIN, ADMIN, AGENT) with AWS Cognito authentication
- **Client Management**: Complete CRUD operations for client profiles with verification workflows
- **Account Management**: Bank account creation and management with balance tracking
- **Transaction Processing**: Automated transaction ingestion from SFTP and real-time transaction queries
- **AI-Powered Assistance**: Natural language query interface and contextual help guide
- **Audit Logging**: Comprehensive audit trail via SQS → Lambda → DynamoDB
- **Security**: JWT authentication, role-based authorization, encrypted data at rest, VPC isolation

---

## (1) Testing Your Current Setup

This section provides all information needed for evaluators to test the currently deployed Banking Buddy system.

### Application URLs

After deployment, retrieve the following URLs using Terraform outputs:

```bash
cd infrastructure/terraform

# API Gateway Endpoint (Main API)
terraform output api_gateway_endpoint
# Example: https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev

# Frontend Application URL
terraform output frontend_url
# Example: https://d2hvwymdbftfvr.cloudfront.net

# Cognito Hosted UI (for login)
terraform output cognito_hosted_ui_url
# Example: https://banking-buddy-dev-auth.auth.ap-southeast-1.amazoncognito.com
```

**Current Deployment URLs** (if already deployed):

- **API Gateway**: `https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev`
- **Frontend**: `https://d2hvwymdbftfvr.cloudfront.net`
- **Cognito Hosted UI**: `https://banking-buddy-dev-auth.auth.ap-southeast-1.amazoncognito.com`

### Login Credentials

#### Test Users

The following test users are available for testing different roles:

**Agent User:**

- **Email**: `yapzukai@gmail.com`
- **Password**: `Atestaccount123!`
- **Role**: `AGENT`
- **Capabilities**: Can manage clients, create accounts, view transactions for assigned clients

**Admin User:**

- **Email**: `zukai.yap.2023@scis.smu.edu.sg`
- **Password**: `*0gnilxB`
- **Role**: `ADMIN`
- **Capabilities**: Can manage agents, view accounts

**Root Admin User:**

- **Email**: `cs301g2t1@gmail.com` (created during deployment)
- **Password**: Set during initial Cognito setup
- **Role**: `ROOT_ADMIN`
- **Capabilities**: Full system access, can manage all users and view all accounts

#### How to Login

1. **Via Frontend (Recommended)**:
   - Navigate to the Frontend URL (from Terraform output)
   - Click "Login" or "Sign In"
   - Enter credentials above
   - You will be redirected to Cognito Hosted UI for authentication

2. **Via Cognito Hosted UI Directly**:
   - Navigate to Cognito Hosted UI URL (from Terraform output)
   - Enter email and password
   - After login, you'll receive a JWT token

3. **Get JWT Token for API Testing**:

   ```bash
   # After logging in via browser, open Developer Console (F12)
   # Navigate to: Application → Local Storage → Cognito domain
   # Copy the JWT token from 'idToken' or 'accessToken'
   ```

### Test Data Values

#### Sample Client Data

Use the following data to test client creation:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "gender": "Male",
  "email": "john.doe.test@example.com",
  "phoneNumber": "6591234567",
  "address": "123 Orchard Road",
  "city": "Singapore",
  "state": "Central",
  "country": "Singapore",
  "postalCode": "238858"
}
```

#### Sample Account Data

Use the following data to test account creation (after creating a client):

```json
{
  "clientId": "CLT-<client-id-from-create-response>",
  "accountType": "Savings",
  "accountStatus": "Pending",
  "initialDeposit": 1000.00,
  "currency": "SGD",
  "branchId": "BRANCH-001"
}
```

#### Sample Transaction Data

Transactions are automatically ingested from the SFTP server. To verify transactions exist:

```bash
# Query transactions via API (requires JWT token)
GET /api/v1/transactions?page=0&limit=10
Authorization: Bearer <your-jwt-token>
```

### Testing Workflow

#### 1. Test Authentication

```bash
# Get JWT token via Cognito Hosted UI or programmatically
# Then test authenticated endpoint:
curl -X GET \
  "https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/v1/users" \
  -H "Authorization: Bearer <your-jwt-token>"
```

#### 2. Test Client Management (Agent Role)

```bash
# Create a client
curl -X POST \
  "https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/v1/clients" \
  -H "Authorization: Bearer <agent-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "dateOfBirth": "1985-03-20",
    "gender": "Female",
    "email": "jane.smith.test@example.com",
    "phoneNumber": "6598765432",
    "address": "456 Marina Bay",
    "city": "Singapore",
    "state": "Central",
    "country": "Singapore",
    "postalCode": "018956"
  }'

# Get all clients (agent sees only their clients)
curl -X GET \
  "https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/v1/clients" \
  -H "Authorization: Bearer <agent-jwt-token>"
```

#### 3. Test Account Management

```bash
# Create an account for a client
curl -X POST \
  "https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/v1/accounts" \
  -H "Authorization: Bearer <agent-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "CLT-<client-id>",
    "accountType": "Savings",
    "initialDeposit": 5000.00,
    "currency": "SGD",
    "branchId": "BRANCH-001"
  }'
```

#### 4. Test AI Features

```bash
# Natural language query
curl -X POST \
  "https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/v1/ai/query" \
  -H "Authorization: Bearer <agent-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me all my clients"
  }'
```

#### 5. Verify Audit Logs

```bash
# Check audit logs via API (requires admin/root_admin role)
curl -X GET \
  "https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/v1/audit/logs" \
  -H "Authorization: Bearer <admin-jwt-token>"
```

### Health Check Endpoints

```bash
# API Gateway health check
curl https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/health

# User Service health check (via ALB)
# Get ALB DNS from: terraform output user_service_alb_dns
curl http://<alb-dns>/actuator/health
```

### Expected Test Results

- **Authentication**: Should return 200 OK with JWT token
- **Client Creation**: Should return 201 Created with client details
- **Account Creation**: Should return 201 Created with account details
- **Transaction Query**: Should return 200 OK with transaction list
- **AI Query**: Should return 200 OK with natural language response
- **Audit Logs**: Should return 200 OK with audit entries

### Troubleshooting

If you encounter issues:

1. **401 Unauthorized**: Verify JWT token is valid and not expired
2. **403 Forbidden**: Check user role has required permissions
3. **404 Not Found**: Verify API endpoint URL is correct (should include `/api/v1/`)
4. **500 Internal Server Error**: Check CloudWatch logs for service errors

For detailed troubleshooting, see [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md#troubleshooting).

---

## (2) Setting Up in a New Region

This section provides instructions for deploying Banking Buddy in a different AWS region (e.g., Hong Kong - `ap-east-1`).

### Prerequisites

- AWS Account with admin access
- AWS CLI configured (`aws configure`)
- Terraform ≥ 1.0 installed
- All required tools (Java 21, Maven, Node.js, Docker, MySQL client)
- EC2 Key Pair created in the target region

### Step 1: Update Region Configuration

1. **Navigate to Terraform directory**:

   ```bash
   cd infrastructure/terraform
   ```

2. **Create or update environment configuration file**:

   ```bash
   cp environments/dev.tfvars.example environments/hongkong.tfvars
   ```

3. **Edit the configuration file** with region-specific values:

   ```hcl
   # Change AWS region
   aws_region = "ap-east-1"  # Hong Kong region
   
   # Update availability zones for the new region
   availability_zones = ["ap-east-1a", "ap-east-1b"]
   
   # Keep other settings as needed
   project_name = "banking-buddy"
   environment  = "dev"
   team_name    = "cs301-g2t1"
   
   # VPC Configuration (can keep same CIDR if not conflicting)
   vpc_cidr = "10.0.0.0/16"
   
   # Database configuration
   db_instance_class    = "db.t3.micro"
   db_allocated_storage = 5
   
   # Lambda configuration
   lambda_memory_size = 512
   lambda_timeout     = 900
   
   # Developer IPs (update with your IP)
   developer_ips = [
     "YOUR_IP_HERE/32",
     "10.119.0.0/16"  # SMU CIDR (if applicable)
   ]
   
   # Database credentials (use strong passwords)
   rds_username      = "admin"
   rds_password      = "YourSecurePassword123!"
   rds_database_name = "crm_transactions"
   
   # SFTP credentials
   sftp_username = "sftpuser"
   sftp_password = "YourSecureSFTPPassword123!"
   
   # CRM database users
   crm_users_db_username = "crm_services_user"
   crm_users_db_password = "YourSecureDBPassword123!"
   
   crm_transactions_db_username = "crm_services_user"
   crm_transactions_db_password = "YourSecureDBPassword123!"
   
   crm_clients_db_username = "crm_services_user"
   crm_clients_db_password = "YourSecureDBPassword123!"
   
   # SES Configuration (verify email in new region)
   ses_sender_email = "your-email@example.com"
   
   # EC2 Key Pair (create in new region first)
   ec2_key_pair_name = "banking-buddy-dev"
   
   # Audit logging
   audit_dynamodb_read_capacity  = 5
   audit_dynamodb_write_capacity = 5
   audit_log_retention_days      = 2555
   
   # Root admin email
   root_admin_email = "your-admin@example.com"
   
   # ElastiCache configuration
   redis_node_type = "cache.t3.micro"
   redis_num_cache_clusters = 2
   
   # OpenAI API Key (if using AI service)
   openai_api_key = "your-openai-api-key"
   
   # AWS Backup configuration
   backup_retention_days = 7
   weekly_backup_retention_days = 30
   ```

### Step 2: Create Prerequisites in New Region

1. **Create EC2 Key Pair**:

   ```bash
   aws ec2 create-key-pair \
     --key-name banking-buddy-dev \
     --region ap-east-1 \
     --query 'KeyMaterial' \
     --output text > ~/.ssh/banking-buddy-dev-hk.pem
   chmod 400 ~/.ssh/banking-buddy-dev-hk.pem
   ```

2. **Create S3 Bucket for Terraform State** (in the new region):

   ```bash
   aws s3 mb s3://banking-buddy-dev-terraform-state-hk --region ap-east-1
   
   aws s3api put-bucket-versioning \
     --bucket banking-buddy-dev-terraform-state-hk \
     --versioning-configuration Status=Enabled \
     --region ap-east-1
   
   aws s3api put-bucket-encryption \
     --bucket banking-buddy-dev-terraform-state-hk \
     --server-side-encryption-configuration '{
       "Rules": [{
         "ApplyServerSideEncryptionByDefault": {
           "SSEAlgorithm": "AES256"
         }
       }]
     }' \
     --region ap-east-1
   ```

3. **Update Terraform Backend** (`infrastructure/terraform/backend.tf`):

   ```hcl
   terraform {
     backend "s3" {
       bucket       = "banking-buddy-dev-terraform-state-hk"  # Your new bucket
       key          = "infrastructure/terraform.tfstate"
       region       = "ap-east-1"  # New region
       encrypt      = true
       use_lockfile = true
     }
   }
   ```

4. **Verify SES Email** (required for email notifications):

   ```bash
   aws ses verify-email-identity \
     --email-address your-email@example.com \
     --region ap-east-1
   ```

### Step 3: Deploy Infrastructure

1. **Initialize Terraform**:

   ```bash
   cd infrastructure/terraform
   terraform init
   ```

2. **Review deployment plan**:

   ```bash
   terraform plan -var-file=environments/hongkong.tfvars
   ```

3. **Deploy infrastructure**:

   ```bash
   terraform apply -var-file=environments/hongkong.tfvars
   ```

   ⏱️ **Deployment Time**: ~25-30 minutes

### Step 4: Initialize Databases

1. **Run database setup script**:

   ```bash
   cd infrastructure/terraform
   ./setup-database.sh
   ```

   The script will:
   - Connect to RDS instance
   - Create databases (`crm_users`, `crm_clients`, `crm_transactions`)
   - Create database users with appropriate permissions
   - Run Flyway migrations

### Step 5: Deploy Application Services

1. **Deploy User Service**:

   ```bash
   cd services/user-service
   mvn clean package -DskipTests
   eb deploy $(terraform -chdir=../../infrastructure/terraform output -raw user_service_environment_name)
   ```

2. **Deploy Client Service**:

   ```bash
   cd services/client-service
   mvn clean package -DskipTests
   eb deploy $(terraform -chdir=../../infrastructure/terraform output -raw client_service_environment_name)
   ```

3. **Deploy Transaction Service**:

   ```bash
   cd services/transaction-service
   mvn clean package -DskipTests
   eb deploy $(terraform -chdir=../../infrastructure/terraform output -raw transaction_service_environment_name)
   ```

4. **Deploy AI Service**:

   ```bash
   cd services/ai-service
   mvn clean package -DskipTests
   eb deploy $(terraform -chdir=../../infrastructure/terraform output -raw ai_service_environment_name)
   ```

5. **Deploy Frontend**:

   ```bash
   cd services/frontend
   npm install
   npm run build
   
   # Upload to S3
   aws s3 sync dist/ s3://$(terraform -chdir=../../infrastructure/terraform output -raw frontend_s3_bucket_name) --delete --region ap-east-1
   
   # Invalidate CloudFront cache
   aws cloudfront create-invalidation \
     --distribution-id $(terraform -chdir=../../infrastructure/terraform output -raw cloudfront_distribution_id) \
     --paths "/*" \
     --region ap-east-1
   ```

### Step 6: Verify Deployment

1. **Get deployment outputs**:

   ```bash
   cd infrastructure/terraform
   terraform output
   ```

2. **Test health endpoints**:

   ```bash
   # API Gateway health
   curl $(terraform output -raw api_gateway_endpoint)/health
   
   # User Service health
   curl http://$(terraform output -raw user_service_alb_dns)/actuator/health
   ```

3. **Create test user and verify login**:

   ```bash
   USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
   
   aws cognito-idp admin-create-user \
     --user-pool-id $USER_POOL_ID \
     --username test@example.com \
     --user-attributes \
       Name=email,Value=test@example.com \
       Name=email_verified,Value=true \
       Name=custom:role,Value=agent \
     --temporary-password TempPass123! \
     --message-action SUPPRESS \
     --region ap-east-1
   ```

### Region-Specific Considerations

#### Availability Zones

Different regions have different availability zone identifiers:

- **ap-southeast-1** (Singapore): `ap-southeast-1a`, `ap-southeast-1b`, `ap-southeast-1c`
- **ap-east-1** (Hong Kong): `ap-east-1a`, `ap-east-1b`
- **us-east-1** (N. Virginia): `us-east-1a`, `us-east-1b`, `us-east-1c`, etc.

Update `availability_zones` in your `.tfvars` file accordingly.

#### Service Availability

Some AWS services may have limited availability in certain regions:

- Verify RDS instance types are available in your target region
- Check ElastiCache node types availability
- Confirm SES is available (some regions require moving out of sandbox mode)

#### Cost Differences

Costs may vary by region. Check AWS pricing for:

- EC2 instances
- RDS instances
- NAT Gateway data transfer
- ElastiCache nodes

### Troubleshooting Regional Deployment

1. **Service not available in region**: Check AWS service availability page
2. **SES email not verified**: Verify email in the new region before deployment
3. **Key pair not found**: Ensure key pair is created in the target region
4. **VPC CIDR conflicts**: Change `vpc_cidr` if it conflicts with existing VPCs

For detailed troubleshooting, see [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md#troubleshooting).

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │   WAF + Shield  │
                  └────────┬────────┘
                           │
         ┌─────────────────┴──────────────────┐
         │                                    │
  ┌──────▼──────┐                  ┌─────────▼─────────┐
  │  Frontend   │                  │   API Gateway     │
  │  React App  │                  │  + Cognito Auth   │
  │  (S3+CF)    │                  │  JWT Validation   │
  └─────────────┘                  └─────────┬─────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    │         Application Layer (Elastic Beanstalk)   │
                    │                                                 │
          ┌─────────▼─────────┐          ┌──────────▼─────────┐
          │  User Service     │          │  Client Service    │
          │  Spring Boot      │          │  Spring Boot       │
          │  Multi-AZ         │          │  Multi-AZ          │
          └─────────┬─────────┘          └──────────┬─────────┘
                    │                               │
                    └──────────────┬────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
       ┌──────▼──────┐     ┌──────▼──────┐    ┌───────▼────────┐
       │  RDS MySQL  │     │   Redis     │    │    Cognito     │
       │  Multi-AZ   │     │ ElastiCache │    │   User Pools   │
       │  Encrypted  │     │  Cluster    │    │  + Hosted UI   │
       └─────────────┘     └─────────────┘    └────────────────┘
              │
       ┌──────▼──────────────────────────────┐
       │    Observability & Audit Layer      │
       │  - CloudWatch Logs & Metrics        │
       │  - DynamoDB Audit Logs              │
       │  - SQS for Async Processing         │
       └─────────────────────────────────────┘
```

---

## Technology Stack

- **Backend**: Spring Boot 3.5.6+ (Java 21)
- **Frontend**: React 18+ with Vite, Tailwind CSS
- **Database**: MySQL 8.0 (RDS), DynamoDB (audit logs)
- **Cache**: Redis (ElastiCache)
- **Infrastructure**: Terraform, AWS (EB, API Gateway, Cognito, S3, CloudFront)
- **Authentication**: AWS Cognito User Pools with JWT
- **AI**: OpenAI integration for natural language queries

---

## Documentation

### Essential Guides

- [QUICK_START.md](./docs/QUICK_START.md) - Quick deployment guide
- [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) - Complete deployment manual
- [README-DATABASE-SETUP.md](./docs/README-DATABASE-SETUP.md) - Database setup instructions

### Technical Documentation

- [CLIENT_SERVICE_SPECIFICATION.md](./docs/CLIENT_SERVICE_SPECIFICATION.md) - Client service API specification
- [AUDIT_LOGGING_USAGE_GUIDE.md](./docs/AUDIT_LOGGING_USAGE_GUIDE.md) - Audit logging implementation
- [API_VERSIONING_POLICY.md](./docs/API_VERSIONING_POLICY.md) - API versioning strategy
- [BACKUP_AND_RESTORE_STRATEGY.md](./docs/BACKUP_AND_RESTORE_STRATEGY.md) - Backup procedures
- [REDIS_CACHING_GUIDE.md](./docs/REDIS_CACHING_GUIDE.md) - Caching strategy

---

## Project Status

**Status**: ✅ Production Ready  
**Deployment Model**: Single-staged (mimics production environment)  
**Current Region**: ap-southeast-1 (Singapore)  
**Last Updated**: 2025-11-16

---

## Support

For detailed information, troubleshooting, and advanced configuration:

- See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for comprehensive documentation
- Check CloudWatch logs for runtime issues
- Review Terraform state for infrastructure issues

---

**Ready to deploy?** Start with [QUICK_START.md](./docs/QUICK_START.md)  
**Need more details?** Check [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)
