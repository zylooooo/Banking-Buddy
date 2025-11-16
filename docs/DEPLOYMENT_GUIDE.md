# Banking Buddy - Complete Deployment Guide

> **Purpose:** This guide enables developers to reproduce the entire infrastructure and deploy all services from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Infrastructure Deployment](#infrastructure-deployment)
5. [Database Setup](#database-setup)
6. [Application Deployment](#application-deployment)
7. [Verification & Testing](#verification--testing)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| AWS CLI | ≥ 2.x | AWS resource management |
| Terraform | ≥ 1.0 | Infrastructure provisioning |
| Java | 21 | User/Client/Transaction services |
| Maven | ≥ 3.8 | Java build tool |
| Node.js | ≥ 18 | Frontend build |
| npm | ≥ 9 | Frontend dependencies |
| Python | 3.9 | Transaction processor |
| Docker | ≥ 20.x | Lambda build, local testing |
| MySQL Client | ≥ 8.0 | Database initialization |
| Git | Latest | Version control |

### AWS Requirements

- **AWS Account** with admin access
- **Programmatic access** (Access Key ID + Secret)
- **EC2 Key Pair** created in your target region
- **Sufficient service limits:**
  - VPC: 1 (default is 5)
  - Elastic IPs: 1 (default is 5)
  - NAT Gateways: 1 (default is 5)
  - RDS instances: 1 (default is 40)
  - Elastic Beanstalk environments: 1 (default is 200)

### AWS CLI Configuration

```bash
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region: ap-southeast-1 (or your preferred region)
# Default output format: json
```

**Verify:**

```bash
aws sts get-caller-identity
```

### IAM Permissions Required

Your AWS user/role needs:

- `AdministratorAccess` (recommended for initial setup)
- OR specific managed policies:
  - `IAMFullAccess`
  - `AmazonVPCFullAccess`
  - `AmazonRDSFullAccess`
  - `AmazonEC2FullAccess`
  - `ElasticBeanstalkFullAccess`
  - `AmazonAPIGatewayAdministrator`
  - `AmazonCognitoPowerUser`
  - `AmazonS3FullAccess`
  - `CloudWatchFullAccess`

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                          Internet                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   CloudFront    │ (optional)
                    │   + WAF         │
                    └────────┬────────┘
                             │
           ┌─────────────────┴──────────────────┐
           │                                    │
    ┌──────▼──────┐                   ┌────────▼────────┐
    │  Frontend   │                   │  API Gateway    │
    │  (S3)       │                   │  + Cognito Auth │
    └─────────────┘                   └────────┬────────┘
                                               │
                              ┌────────────────┴────────────────┐
                              │                                 │
                    ┌─────────▼─────────┐          ┌──────────▼─────────┐
                    │  User Service     │          │  Client Service    │
                    │(Elastic Beanstalk)|          │ (Elastic Beanstalk)│
                    │  - ALB            │          │  - ALB             │
                    │  - EC2 (Multi-AZ) │          │  - EC2 (Multi-AZ)  │
                    └─────────┬─────────┘          └──────────┬─────────┘
                              │                               │
                              └────────────┬──────────────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼─────┐
                   │  RDS MySQL  │  │   Redis     │  │  Cognito  │
                   │  (Multi-AZ) │  │ ElastiCache │  │ User Pool │
                   └─────────────┘  └─────────────┘  └───────────┘
```

### Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **API Gateway** | API entry point, JWT validation | AWS API Gateway (REST) |
| **User Service** | User management, authentication | Spring Boot + Java 21 |
| **Client Service** | Client (customer) management | Spring Boot + Java 21 |
| **Transaction Service** | Transaction processing | Spring Boot + Java 21 |
| **Transaction Processor** | Nightly batch job (SFTP → DB) | Python 3.9 Lambda |
| **Frontend** | React web application | React + Vite + Tailwind |
| **RDS** | Relational database | MySQL 8.0 |
| **Redis** | Session/cache store | ElastiCache Redis |
| **Cognito** | User authentication | AWS Cognito User Pools |
| **S3** | File storage | AWS S3 |
| **DynamoDB** | Audit logs | AWS DynamoDB |
| **SQS** | Async audit queue | AWS SQS |

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd Banking-Buddy
```

### 2. Create EC2 Key Pair

```bash
# Replace 'ap-southeast-1' with your region
aws ec2 create-key-pair \
  --key-name banking-buddy-dev \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/banking-buddy-dev.pem

chmod 400 ~/.ssh/banking-buddy-dev.pem
```

### 3. Create S3 Bucket for Terraform State

```bash
# Replace with unique bucket name and region
aws s3 mb s3://banking-buddy-dev-terraform-state --region ap-southeast-1

# Enable versioning (important for state recovery)
aws s3api put-bucket-versioning \
  --bucket banking-buddy-dev-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket banking-buddy-dev-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 4. Configure Terraform Backend

**File:** `infrastructure/terraform/backend.tf`

```terraform
terraform {
  backend "s3" {
    bucket       = "banking-buddy-dev-terraform-state"  # Your bucket name
    key          = "infrastructure/terraform.tfstate"
    region       = "ap-southeast-1"  # Your region
    encrypt      = true
    use_lockfile = true
  }
}
```

### 5. Create Terraform Variables File

```bash
cd infrastructure/terraform
cp environments/dev.tfvars.example environments/dev.tfvars
```

**Edit:** `environments/dev.tfvars`

```terraform
# AWS Configuration
aws_region         = "ap-southeast-1"
project_name       = "banking-buddy"
environment        = "dev"
team_name          = "your-team-name"

# Network Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["ap-southeast-1a", "ap-southeast-1b"]
developer_ips      = ["YOUR_IP_ADDRESS/32"]  # Get via: curl ifconfig.me

# EC2 Configuration
ec2_key_pair_name = "banking-buddy-dev"

# Database Configuration
db_instance_class     = "db.t3.micro"  # or db.t3.small for prod
db_allocated_storage  = 20

# Lambda Configuration
lambda_memory_size = 512
lambda_timeout     = 300

# Secrets (CHANGE THESE!)
rds_username      = "admin"
rds_password      = "ChangeMe123456!"  # Min 8 chars, alphanumeric
rds_database_name = "crm_transactions"
sftp_username     = "sftpuser"
sftp_password     = "ChangeMe123456!"
crm_users_db_username = "crm_user_service"
crm_users_db_password = "ChangeMe123456!"

# Email Configuration
ses_sender_email = "noreply@yourdomain.com"  # Must verify in SES
root_admin_email = "admin@yourdomain.com"

# DynamoDB Configuration (Audit Logs)
audit_dynamodb_read_capacity  = 5
audit_dynamodb_write_capacity = 5
audit_log_retention_days      = 2555  # 7 years

# Audit API Configuration
audit_api_allowed_origins = [
  "http://localhost:3000",
  "http://localhost:5173"
]

# Redis Configuration
redis_node_type           = "cache.t3.micro"
redis_num_cache_clusters  = 2

# Custom Domain (Optional - Leave empty if not using)
root_domain_name = ""  # e.g., "yourdomain.com"
api_domain_name  = ""  # e.g., "api.yourdomain.com"
route53_zone_id  = ""  # Your Route53 zone ID
```

---

## Infrastructure Deployment

### Step 1: Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

**Expected output:**

```text
Initializing the backend...
Successfully configured the backend "s3"!
Initializing provider plugins...
Terraform has been successfully initialized!
```

### Step 2: Validate Configuration

```bash
terraform validate
```

### Step 3: Plan Deployment

```bash
terraform plan -var-file=environments/dev.tfvars -out=tfplan
```

**Review the plan carefully:**

- Check resource counts (should create ~80-100 resources)
- Verify no resources will be destroyed (first deployment)
- Confirm values match your configuration

### Step 4: Apply Infrastructure

```bash
terraform apply tfplan
```

⏱️ **Duration:** 25-35 minutes

**What gets created:**

1. **VPC & Networking** (2 min)
   - VPC with public/private subnets
   - Internet Gateway, NAT Gateway
   - Route tables, security groups

2. **Database** (10-15 min)
   - RDS MySQL instance (Multi-AZ)
   - ElastiCache Redis cluster

3. **Compute** (5-10 min)
   - Elastic Beanstalk environment
   - EC2 instances for EB
   - SFTP server (for transaction processor)
   - Lambda function (transaction processor)

4. **Authentication** (2-3 min)
   - Cognito User Pool
   - Cognito App Client
   - Hosted UI customization

5. **API Gateway** (2-3 min)
   - REST API
   - Routes and integrations
   - Cognito authorizer

6. **Storage & Queuing** (2-3 min)
   - S3 bucket
   - DynamoDB table (audit logs)
   - SQS queues (audit processing)

7. **Observability** (2-3 min)
   - CloudWatch Log Groups
   - CloudWatch Alarms
   - X-Ray tracing

### Step 5: Save Outputs

```bash
terraform output > ../terraform-outputs.txt
```

**Important outputs:**

```bash
# API Gateway endpoint
terraform output api_gateway_endpoint

# User service endpoint
terraform output user_service_endpoint

# Cognito configuration
terraform output cognito_user_pool_id
terraform output cognito_hosted_ui_url

# Database endpoint
terraform output rds_endpoint
```

---

## Database Setup

### Step 1: Verify RDS Access

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(terraform output -raw rds_endpoint | cut -d: -f1)

# Test connection (from a machine with DB access)
mysql -h $RDS_ENDPOINT -u admin -p
# Enter password from dev.tfvars
```

### Step 2: Run Database Initialization Script

```bash
cd infrastructure/terraform
./setup-database.sh
```

**What it does:**

1. Creates `crm_users` database
2. Creates dedicated user `crm_user_service`
3. Grants appropriate permissions
4. Updates Secrets Manager with credentials

**Verify:**

```bash
mysql -h $RDS_ENDPOINT -u crm_user_service -p crm_users
# Enter crm_users_db_password from dev.tfvars

SHOW TABLES;  # Should be empty initially
```

---

## Application Deployment

### Deploy User Service

#### Build Application

```bash
cd services/user-service

# Build JAR
mvn clean package -DskipTests

# Verify JAR created
ls -lh target/user-service-0.0.1-SNAPSHOT.jar
```

#### Deploy to Elastic Beanstalk

```bash
# Get EB environment name
EB_ENV_NAME=$(cd ../../infrastructure/terraform && terraform output -raw user_service_environment_name)

# Create application version
aws elasticbeanstalk create-application-version \
  --application-name banking-buddy-dev-user-service \
  --version-label v1.0.0-$(date +%Y%m%d-%H%M%S) \
  --source-bundle S3Bucket="elasticbeanstalk-ap-southeast-1-<account-id>",S3Key="user-service.jar" \
  --auto-create-application

# Alternative: Use EB CLI
eb init -p "Java 21 running on 64bit Amazon Linux 2023" banking-buddy-dev-user-service
eb deploy $EB_ENV_NAME
```

#### Verify Deployment

```bash
# Get ALB endpoint
ALB_ENDPOINT=$(cd ../../infrastructure/terraform && terraform output -raw user_service_alb_dns)

# Test health check
curl http://$ALB_ENDPOINT/actuator/health

# Expected: {"status":"UP"}
```

### Deploy Client Service (Similar Process)

```bash
cd services/client-service
mvn clean package -DskipTests
# Deploy via EB CLI or console
```

### Deploy Transaction Service (Similar Process)

```bash
cd services/transaction-service
mvn clean package -DskipTests
# Deploy via EB CLI or console
```

### Deploy Frontend

```bash
cd services/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Upload to S3 (if hosting on S3)
aws s3 sync dist/ s3://your-frontend-bucket/ --delete

# Or deploy to CloudFront
```

---

## Verification & Testing

### 1. Check Infrastructure Health

```bash
cd infrastructure/terraform

# Check all outputs
terraform output

# Verify Elastic Beanstalk health
aws elasticbeanstalk describe-environments \
  --environment-names banking-buddy-dev-user-env \
  --query 'Environments[0].Health'

# Expected: "Green"
```

### 2. Test Authentication Flow

#### Get Cognito Configuration

```bash
COGNITO_DOMAIN=$(terraform output -raw cognito_hosted_ui_url)
echo "Cognito Hosted UI: $COGNITO_DOMAIN"
```

#### Create Test User

```bash
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)

aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username testuser@example.com \
  --user-attributes \
    Name=email,Value=testuser@example.com \
    Name=email_verified,Value=true \
    Name=custom:role,Value=agent \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

#### Login and Get JWT

1. Open Cognito Hosted UI in browser
2. Login with test user
3. Complete password change
4. Copy JWT token from developer console

**Or use script:**

```bash
# Get JWT token programmatically
./get-jwt.ps1  # If on Windows
# Or use AWS SDK to initiate auth flow
```

### 3. Test API Gateway

```bash
API_ENDPOINT=$(terraform output -raw api_gateway_endpoint)
JWT_TOKEN="<your-jwt-token>"

# Test authenticated endpoint
curl -X GET \
  "$API_ENDPOINT/api/users" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Should return user data or empty array
```

### 4. Test User Service via API Gateway

```bash
# Create user
curl -X POST \
  "$API_ENDPOINT/api/users" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "agent"
  }'

# Get users
curl -X GET \
  "$API_ENDPOINT/api/users" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get specific user
curl -X GET \
  "$API_ENDPOINT/api/users/{userId}" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 5. Verify Audit Logging

```bash
# Check SQS queue for audit messages
SQS_URL=$(terraform output -raw audit_sqs_queue_url)

aws sqs get-queue-attributes \
  --queue-url $SQS_URL \
  --attribute-names ApproximateNumberOfMessages

# Check DynamoDB for audit entries
DYNAMODB_TABLE=$(terraform output -raw audit_logs_dynamodb_table_name)

aws dynamodb scan \
  --table-name $DYNAMODB_TABLE \
  --limit 10
```

### 6. Check Logs

```bash
# API Gateway logs
aws logs tail /aws/apigateway/banking-buddy-dev-api --follow

# User service logs (Elastic Beanstalk)
eb logs banking-buddy-dev-user-env

# Lambda logs (transaction processor)
aws logs tail /aws/lambda/banking-buddy-dev-transaction-processor --follow
```

---

## Troubleshooting

### Issue: Terraform Apply Fails

**Symptom:** Resources fail to create

**Solutions:**

1. **Check AWS limits:**

   ```bash
   aws service-quotas list-service-quotas \
     --service-code elasticbeanstalk
   ```

2. **Verify credentials:**

   ```bash
   aws sts get-caller-identity
   ```

3. **Check state lock:**

   ```bash
   # If state is locked, force unlock (use carefully)
   terraform force-unlock <lock-id>
   ```

### Issue: Elastic Beanstalk Shows "Unknown" Health

**Symptom:** EB environment health is grey/unknown

**Solutions:**

1. **Check instance health:**

   ```bash
   aws elasticbeanstalk describe-instances-health \
     --environment-name banking-buddy-dev-user-env
   ```

2. **Verify IAM roles:**

   ```bash
   # Check instance profile has correct policies
   aws iam list-attached-role-policies \
     --role-name banking-buddy-dev-elastic-beanstalk-role
   ```

3. **Replace instances (if IAM was updated):**

   ```bash
   # Terminate instances to force replacement
   aws autoscaling set-desired-capacity \
     --auto-scaling-group-name <asg-name> \
     --desired-capacity 0
   
   aws autoscaling set-desired-capacity \
     --auto-scaling-group-name <asg-name> \
     --desired-capacity 2
   ```

### Issue: API Gateway Returns 401 "Missing authentication header"

**Symptom:** All API calls return 401 even with valid JWT

**Solutions:**

1. **Verify JWT token:**

   ```bash
   # Decode JWT at jwt.io
   # Check expiration (exp claim)
   # Verify issuer matches Cognito User Pool
   ```

2. **Check Authorization header format:**

   ```bash
   # Must be: Authorization: Bearer <token>
   # NOT: Authorization: <token>
   ```

3. **Verify API Gateway configuration:**

   ```bash
   aws apigateway get-authorizers \
     --rest-api-id <api-id>
   ```

4. **Check backend logs for header presence:**

   ```bash
   eb logs banking-buddy-dev-user-env | grep "Authorization"
   ```

### Issue: Database Connection Fails

**Symptom:** Application can't connect to RDS

**Solutions:**

1. **Check security groups:**

   ```bash
   # EB instances must have access to RDS security group
   aws ec2 describe-security-groups \
     --group-ids <rds-sg-id>
   ```

2. **Verify credentials:**

   ```bash
   # Check Secrets Manager
   aws secretsmanager get-secret-value \
     --secret-id banking-buddy-dev-crm-db-credentials-*
   ```

3. **Test connectivity from EB instance:**

   ```bash
   # SSH into EB instance
   eb ssh banking-buddy-dev-user-env
   
   # Test DB connection
   mysql -h <rds-endpoint> -u crm_user_service -p
   ```

### Issue: Transaction Processor Lambda Fails

**Symptom:** Lambda function times out or fails

**Solutions:**

1. **Check Lambda logs:**

   ```bash
   aws logs tail /aws/lambda/banking-buddy-dev-transaction-processor \
     --follow --since 1h
   ```

2. **Verify SFTP connectivity:**

   ```bash
   # Lambda must be in VPC with access to SFTP server
   # Check security groups allow port 22
   ```

3. **Test SFTP connection:**

   ```bash
   sftp -P 22 <sftp-user>@<sftp-server-ip>
   ```

---

## Maintenance

### Regular Tasks

#### Daily

- Monitor CloudWatch alarms
- Check error rates in API Gateway
- Review audit logs for anomalies

#### Weekly

- Review CloudWatch costs
- Check for failed Lambda executions
- Verify backup completion
- Update dependencies (security patches)

#### Monthly

- Review IAM policies (least privilege)
- Rotate credentials
- Update Terraform providers
- Test disaster recovery procedure
- Review and optimize costs

### Updates and Deployments

#### Update Infrastructure

```bash
cd infrastructure/terraform

# Pull latest changes
git pull

# Plan changes
terraform plan -var-file=environments/dev.tfvars -out=tfplan

# Review carefully
terraform show tfplan

# Apply
terraform apply tfplan
```

#### Update Application

```bash
cd services/user-service

# Build new version
mvn clean package -DskipTests

# Deploy
eb deploy banking-buddy-dev-user-env
```

### Backup and Recovery

#### RDS Backups

Automatic daily backups enabled (7-day retention)

**Manual backup:**

```bash
aws rds create-db-snapshot \
  --db-instance-identifier banking-buddy-dev-rds-mysql \
  --db-snapshot-identifier banking-buddy-manual-$(date +%Y%m%d)
```

**Restore from backup:**

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier banking-buddy-restored \
  --db-snapshot-identifier <snapshot-id>
```

#### Terraform State Backup

State is automatically versioned in S3.

**Restore previous state:**

```bash
# List versions
aws s3api list-object-versions \
  --bucket banking-buddy-dev-terraform-state \
  --prefix infrastructure/terraform.tfstate

# Download specific version
aws s3api get-object \
  --bucket banking-buddy-dev-terraform-state \
  --key infrastructure/terraform.tfstate \
  --version-id <version-id> \
  terraform.tfstate.backup
```

### Scaling

#### Horizontal Scaling (Auto Scaling)

Already configured! EB auto-scales based on:

- CPU utilization > 70%
- Min instances: 2
- Max instances: 4

**Adjust:**
Edit `infrastructure/terraform/services/user-service/main.tf`:

```terraform
setting {
  namespace = "aws:autoscaling:asg"
  name      = "MinSize"
  value     = "3"  # Increase minimum
}
```

#### Vertical Scaling (Instance Size)

Edit `infrastructure/terraform/services/user-service/main.tf`:

```terraform
setting {
  namespace = "aws:autoscaling:launchconfiguration"
  name      = "InstanceType"
  value     = "t3.medium"  # Upgrade from t3.small
}
```

### Monitoring and Alerts

#### Set Up CloudWatch Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name user-service-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

#### Dashboard

Create CloudWatch dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name banking-buddy-dev \
  --dashboard-body file://dashboard-config.json
```

### Cost Optimization

#### Current Monthly Estimate (dev environment)

| Service | Cost (USD) |
|---------|------------|
| RDS (t3.micro) | ~$25 |
| ElastiCache (t3.micro x2) | ~$35 |
| Elastic Beanstalk (t3.small x2) | ~$30 |
| NAT Gateway | ~$35 |
| API Gateway | ~$3.50 per million requests |
| Lambda | ~$0.20 per million requests |
| S3 | ~$1 (minimal storage) |
| CloudWatch | ~$5 |
| **Total** | **~$135-150/month** |

#### Cost Reduction Tips

1. **Stop non-production environments overnight:**

   ```bash
   # Stop EB environment
   aws elasticbeanstalk update-environment \
     --environment-name banking-buddy-dev-user-env \
     --option-settings Namespace=aws:autoscaling:asg,OptionName=MinSize,Value=0
   ```

2. **Use Reserved Instances** (40-60% savings)
3. **Enable S3 Lifecycle policies** (move to IA/Glacier)
4. **Review CloudWatch log retention** (reduce to 7 days)
5. **Delete unused EBS snapshots**

---

## Security Best Practices

### 1. Secrets Management

✅ **DO:**

- Use AWS Secrets Manager for all credentials
- Rotate secrets regularly (90 days)
- Use IAM roles instead of access keys
- Enable MFA for root account

❌ **DON'T:**

- Commit secrets to Git
- Use long-lived access keys
- Share credentials via email/Slack
- Use default passwords

### 2. Network Security

✅ **DO:**

- Keep instances in private subnets
- Use security groups as firewalls
- Enable VPC Flow Logs
- Use VPN/Bastion for DB access

❌ **DON'T:**

- Open port 22 to 0.0.0.0/0
- Use default VPC
- Allow direct internet access to databases

### 3. Application Security

✅ **DO:**

- Validate all inputs
- Use parameterized queries
- Log security events
- Enable HTTPS everywhere
- Implement rate limiting

❌ **DON'T:**

- Trust user input
- Expose stack traces
- Log sensitive data (passwords, tokens)
- Allow SQL injection vectors

### 4. Access Control

✅ **DO:**

- Follow principle of least privilege
- Use IAM roles for services
- Enable CloudTrail auditing
- Review IAM policies regularly

❌ **DON'T:**

- Use root account for daily tasks
- Share IAM credentials
- Grant * permissions
- Disable MFA

---

## Next Steps

After successful deployment:

1. ✅ **Set up CI/CD pipeline**
   - GitHub Actions / GitLab CI
   - Automated testing
   - Automated deployments

2. ✅ **Configure monitoring**
   - Set up CloudWatch dashboards
   - Configure alarms
   - Set up PagerDuty/Opsgenie

3. ✅ **Implement disaster recovery**
   - Document RTO/RPO
   - Test backup/restore procedures
   - Set up cross-region replication

4. ✅ **Security hardening**
   - Enable AWS Config
   - Set up GuardDuty
   - Enable Security Hub
   - Conduct security audit

5. ✅ **Performance optimization**
   - Set up APM (Application Performance Monitoring)
   - Optimize database queries
   - Enable caching where appropriate
   - Load testing

---

## Support and Resources

### Documentation

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [API Gateway Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/best-practices.html)

### Useful Commands

```bash
# Terraform
terraform fmt                          # Format code
terraform validate                     # Validate syntax
terraform plan                         # Preview changes
terraform apply                        # Apply changes
terraform destroy                      # Destroy infrastructure
terraform output                       # Show outputs
terraform state list                   # List resources
terraform state show <resource>        # Show resource details

# AWS CLI
aws elasticbeanstalk describe-environments  # List EB environments
aws rds describe-db-instances              # List RDS instances
aws logs tail <log-group> --follow         # Tail logs
aws s3 ls                                  # List S3 buckets
aws iam list-roles                         # List IAM roles

# Maven
mvn clean                              # Clean build
mvn compile                            # Compile
mvn test                               # Run tests
mvn package                            # Build JAR
mvn spring-boot:run                    # Run locally

# EB CLI
eb init                                # Initialize EB app
eb create                              # Create environment
eb deploy                              # Deploy app
eb status                              # Check status
eb logs                                # View logs
eb ssh                                 # SSH into instance
```

---

## Conclusion

You now have a complete, production-grade Banking Buddy deployment! 🎉

This infrastructure is:

- ✅ Highly available (Multi-AZ)
- ✅ Scalable (Auto-scaling configured)
- ✅ Secure (IAM, VPC, encryption)
- ✅ Observable (CloudWatch, X-Ray)
- ✅ Maintainable (Infrastructure as Code)
- ✅ Cost-optimized (Right-sized resources)

**Questions?** Refer to the troubleshooting section or check AWS documentation.

**Feedback?** Help improve this guide by submitting issues or pull requests.

---

**Last Updated:** 2025-11-16  
**Version:** 1.0  
**Maintainer:** Banking Buddy Team
