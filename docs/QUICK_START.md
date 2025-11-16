# Banking Buddy - Quick Start Guide

> **TL;DR:** Deploy the entire Banking Buddy infrastructure in 30 minutes

## Prerequisites Checklist

- [ ] AWS Account with admin access
- [ ] AWS CLI configured (`aws configure`)
- [ ] Terraform installed (≥ 1.0)
- [ ] Docker installed (for Lambda builds)
- [ ] Java 21 + Maven (for backend services)
- [ ] Node.js 18+ + npm (for frontend)
- [ ] MySQL client (for database setup)

## 5-Minute Setup

### 1. Clone and Configure

```bash
# Clone repository
git clone <repo-url>
cd Banking-Buddy/infrastructure/terraform

# Copy and edit configuration
cp environments/dev.tfvars.example environments/dev.tfvars
# Edit dev.tfvars with your settings
```

### 2. Create Prerequisites

```bash
# Create EC2 key pair
aws ec2 create-key-pair --key-name banking-buddy-dev \
  --query 'KeyMaterial' --output text > ~/.ssh/banking-buddy-dev.pem
chmod 400 ~/.ssh/banking-buddy-dev.pem

# Create Terraform state bucket
aws s3 mb s3://banking-buddy-dev-terraform-state-<your-name>
aws s3api put-bucket-versioning \
  --bucket banking-buddy-dev-terraform-state-<your-name> \
  --versioning-configuration Status=Enabled

# Update backend.tf with your bucket name
```

### 3. Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Deploy everything
terraform apply -var-file=environments/dev.tfvars -auto-approve
```

⏱️ **Takes 25-30 minutes**

### 4. Initialize Database

```bash
./setup-database.sh
```

### 5. Deploy Application

```bash
cd ../../services/user-service
mvn clean package -DskipTests
eb deploy $(terraform -chdir=../../infrastructure/terraform output -raw user_service_environment_name)
```

## Verify Deployment

```bash
cd infrastructure/terraform

# Check infrastructure health
terraform output

# Test health check
curl http://$(terraform output -raw user_service_alb_dns)/actuator/health

# Test API Gateway
API_ENDPOINT=$(terraform output -raw api_gateway_endpoint)
echo "API Endpoint: $API_ENDPOINT"
```

## Common Commands

```bash
# View outputs
terraform output

# Get API Gateway URL
terraform output api_gateway_endpoint

# Get Cognito Hosted UI
terraform output cognito_hosted_ui_url

# Check EB health
aws elasticbeanstalk describe-environments \
  --environment-names $(terraform output -raw user_service_environment_name)

# View logs
eb logs $(terraform output -raw user_service_environment_name)
```

## Testing with Postman

1. **Get JWT Token:**
   - Go to: `terraform output -raw cognito_hosted_ui_url`
   - Sign in with test user
   - Copy JWT from developer console (Application → Local Storage)

2. **Test API:**

   ```HTTP
   GET https://<api-gateway-url>/dev/api/users
   Authorization: Bearer <your-jwt-token>
   ```

## Troubleshooting

### EB Health is "Unknown"

```bash
# Replace EC2 instances
aws elasticbeanstalk rebuild-environment \
  --environment-name $(terraform output -raw user_service_environment_name)
```

### API Gateway Returns 401

- Verify JWT token is not expired (check at jwt.io)
- Ensure Authorization header format: `Bearer <token>`
- Check user-service logs: `eb logs <env-name>`

### Database Connection Fails

```bash
# Test from EB instance
eb ssh $(terraform output -raw user_service_environment_name)
mysql -h $(terraform output -raw rds_endpoint | cut -d: -f1) -u crm_user_service -p
```

## Clean Up

```bash
# Destroy everything
cd infrastructure/terraform
terraform destroy -var-file=environments/dev.tfvars

# Delete S3 state bucket (after confirming)
aws s3 rb s3://banking-buddy-dev-terraform-state-<your-name> --force
```

## What Was Deployed?

| Component | Count | Purpose |
|-----------|-------|---------|
| VPC | 1 | Network isolation |
| Subnets | 4 | 2 public + 2 private |
| NAT Gateway | 1 | Internet for private subnets |
| RDS MySQL | 1 | Database (Multi-AZ) |
| ElastiCache Redis | 2 | Cache cluster |
| EB Environment | 1 | User service hosting |
| EC2 Instances | 2+ | Auto-scaled app servers |
| Lambda | 1 | Transaction processor |
| API Gateway | 1 | API entry point |
| Cognito | 1 | User authentication |
| S3 Bucket | 1 | File storage |
| DynamoDB | 1 | Audit logs |
| SQS | 2 | Audit queue + DLQ |
| CloudWatch | Multiple | Logging & monitoring |

**Total Resources:** ~80-100

## Costs (Approximate)

| Environment | Monthly Cost |
|-------------|--------------|
| Dev | $135-150 |
| Staging | $200-250 |
| Production | $400-600 |

Based on minimal usage in ap-southeast-1 region

## Next Steps

1. ✅ Set up CI/CD pipeline
2. ✅ Configure monitoring alarms
3. ✅ Add custom domain to API Gateway
4. ✅ Deploy frontend to S3/CloudFront
5. ✅ Set up backups and disaster recovery

## Support

- **Full Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Database Setup:** [README-DATABASE-SETUP.md](./README-DATABASE-SETUP.md)

## Architecture Diagram

```text
Internet
   ↓
[API Gateway + WAF]
   ↓
[User Service EB]
   ↓
┌──────────────┬──────────────┬──────────────┐
│   RDS MySQL  │  Redis Cache │   Cognito    │
└──────────────┴──────────────┴──────────────┘
```

---

**Status:** ✅ Production Ready  
**Last Updated:** 2025-11-16  
**Version:** 1.0
