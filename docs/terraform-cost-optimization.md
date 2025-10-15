# Terraform Cost Optimization Guide

This document provides instructions for managing AWS infrastructure costs while preserving testing resources for the Banking Buddy project.

## 💰 Cost Analysis & Resource Categorization

### 🔴 EXPENSIVE RESOURCES (Destroy These)

- **RDS MySQL Instance** (`db.t3.micro`) - ~$15-20/month
- **NAT Gateway** - ~$45/month + data processing
- **Elastic IP** (for NAT) - ~$3.6/month when not attached
- **EC2 SFTP Server** (`t3.micro`) - ~$8-10/month
- **Lambda Function** - Minimal cost but running daily
- **CloudWatch Logs** - Storage costs

### 🟢 CHEAP/FREE RESOURCES (Keep These)

- **Cognito User Pool** - FREE (up to 50,000 MAU)
- **SES** - FREE (up to 62,000 emails/month)
- **S3 Bucket** - ~$0.023/GB/month (minimal)
- **Secrets Manager** - $0.40/secret/month
- **DynamoDB** - $1.25/month (5 RCU/WCU)
- **IAM Roles/Policies** - FREE
- **Security Groups** - FREE
- **VPC/Subnets** - FREE

## 🎯 Quick Cost Reduction (Immediate Action)

### Step 1: Destroy Most Expensive Resources

```bash
# Navigate to terraform directory
cd infrastructure/terraform

# Destroy the most expensive resources immediately
terraform destroy -target=module.rds 
terraform destroy -target=module.vpc.aws_nat_gateway.main 
terraform destroy -target=module.vpc.aws_eip.nat 
terraform destroy -target=module.transaction-processor.aws_instance.sftp_server
```

**Expected Savings**: ~$70-80/month

### Step 2: Verify Testing Resources Preserved

After destruction, verify these resources are still intact:

- ✅ Cognito User Pool ID remains the same
- ✅ Client ID remains the same
- ✅ All test users preserved
- ✅ JWT tokens continue working
- ✅ User-service can still authenticate

### Step 3: Update User Service Configuration

Since RDS is destroyed, ensure your user-service uses local MySQL:

```bash
# Verify .env.user-service configuration
DB_URL=db_url
DB_USERNAME=db_username
DB_PASSWORD=db_password
```

## 🛠️ Advanced Cost Management Strategies

### Option 1: Terraform Target Destroy Script

Create a script for repeated use:

```bash
#!/bin/bash
# scripts/destroy-expensive-resources.sh

echo "Destroying expensive AWS resources while preserving testing infrastructure..."

# Destroy RDS (most expensive)
terraform destroy -target=module.rds -auto-approve

# Destroy NAT Gateway and EIP (very expensive)
terraform destroy -target=module.vpc.aws_nat_gateway.main -auto-approve
terraform destroy -target=module.vpc.aws_eip.nat -auto-approve

# Destroy EC2 SFTP Server
terraform destroy -target=module.transaction-processor.aws_instance.sftp_server -auto-approve

# Destroy Lambda and related resources
terraform destroy -target=module.transaction-processor.aws_lambda_function.transaction_processor -auto-approve
terraform destroy -target=module.transaction-processor.aws_cloudwatch_event_rule.daily_schedule -auto-approve
terraform destroy -target=module.transaction-processor.aws_cloudwatch_event_target.lambda -auto-approve
terraform destroy -target=module.transaction-processor.aws_lambda_permission.allow_cloudwatch -auto-approve

# Destroy CloudWatch Log Groups
terraform destroy -target=module.transaction-processor.aws_cloudwatch_log_group.lambda -auto-approve

echo "Expensive resources destroyed. Cognito, SES, S3, and VPC preserved."
```

### Option 2: Conditional Resources (Long-term Solution)

Modify your Terraform to make expensive resources conditional:

```hcl
# In main.tf, wrap expensive modules in conditions
module "rds" {
  count  = var.enable_expensive_resources ? 1 : 0
  source = "./shared/rds"
  # ... rest of config
}

module "transaction-processor" {
  count  = var.enable_expensive_resources ? 1 : 0
  source = "./services/transaction-processor"
  # ... rest of config
}

# In VPC module, make NAT Gateway conditional
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? 1 : 0
  # ... rest of config
}
```

Add to `variables.tf`:

```hcl
variable "enable_expensive_resources" {
  description = "Enable expensive resources (RDS, NAT Gateway, EC2, Lambda)"
  type        = bool
  default     = false
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway (expensive)"
  type        = bool
  default     = false
}
```

### Option 3: Terraform Workspaces

For better resource management:

```bash
# Create separate workspace for testing
terraform workspace new testing
terraform workspace select testing

# Apply only cheap resources
terraform apply -target=module.cognito -target=module.ses -target=module.s3

# Switch back to full infrastructure when needed
terraform workspace select default
```

## 📋 Resource Management Checklist

### ✅ KEEP (Testing Resources)

- [x] Cognito User Pool (`module.cognito`)
- [x] SES Email Identity (`module.ses`)
- [x] S3 Bucket (`module.s3`)
- [x] Secrets Manager (`module.secrets-manager`)
- [x] DynamoDB Audit Table (`module.audit_logging`)
- [x] VPC and Subnets (`module.vpc`)
- [x] Security Groups (`module.security_groups`)
- [x] IAM Roles (`module.iam`)

### ❌ DESTROY (Expensive Resources)

- [x] RDS MySQL Instance (`module.rds`)
- [x] NAT Gateway (`module.vpc.aws_nat_gateway`)
- [x] Elastic IP (`module.vpc.aws_eip`)
- [x] EC2 SFTP Server (`module.transaction-processor.aws_instance`)
- [x] Lambda Function (`module.transaction-processor.aws_lambda_function`)
- [x] CloudWatch Events (`module.transaction-processor.aws_cloudwatch_event_*`)

## 🔄 Re-enabling Resources

When you need the expensive resources back:

```bash
# Re-apply only the expensive modules
terraform apply -target=module.rds
terraform apply -target=module.vpc.aws_nat_gateway.main
terraform apply -target=module.vpc.aws_eip.nat
terraform apply -target=module.transaction-processor
```

## 🚨 Important Notes

### What Happens After Destruction

1. **User Service**: Continues working with local MySQL
2. **Cognito**: All users, roles, and JWT tokens preserved
3. **API Testing**: All endpoints continue to work
4. **Database**: Local MySQL container handles all data

### What Stops Working

1. **Transaction Processor**: Lambda function destroyed
2. **SFTP Server**: EC2 instance destroyed
3. **RDS**: Production database destroyed
4. **NAT Gateway**: Private subnet internet access lost

### Recovery Time

- **Re-enabling resources**: 5-10 minutes
- **Data loss**: None (using local MySQL)
- **Service downtime**: None (user-service unaffected)

## 💡 Best Practices

### Daily Development Workflow

1. **Morning**: Start with expensive resources destroyed
2. **Development**: Use local MySQL and preserved Cognito
3. **Testing**: All API endpoints work normally
4. **Evening**: Destroy expensive resources to save costs

### Before Production Testing

1. **Re-enable resources**: Run the re-enable commands
2. **Test thoroughly**: Verify all functionality
3. **Clean up**: Destroy expensive resources after testing

### Cost Monitoring

```bash
# Check current costs
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# List all resources
terraform state list
```

## 🆘 Troubleshooting

### If User Service Stops Working

1. **Check Docker containers**:

   ```bash
   docker-compose ps
   docker logs banking-buddy-user-service
   ```

2. **Verify database connection**:

   ```bash
   docker exec banking-buddy-mysql mysqladmin ping -h localhost -u root -pBankingBuddy2025
   ```

3. **Check environment variables**:

   ```bash
   cat services/user-service/.env.user-service
   ```

### If Cognito Authentication Fails

1. **Verify Cognito resources exist**:

   ```bash
   terraform state list | grep cognito
   ```

2. **Check JWT token validity**:

   ```bash
   # Use your get-jwt.ps1 script
   .\get-jwt.ps1
   ```

3. **Verify user pool configuration**:

   ```bash
   aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID --region ap-southeast-1
   ```

## 📊 Cost Savings Summary

| Resource | Monthly Cost | Status After Optimization |
|----------|-------------|---------------------------|
| RDS MySQL | $15-20 | ❌ Destroyed |
| NAT Gateway | $45+ | ❌ Destroyed |
| Elastic IP | $3.6 | ❌ Destroyed |
| EC2 SFTP | $8-10 | ❌ Destroyed |
| Lambda | $1-2 | ❌ Destroyed |
| **Total Savings** | **~$70-80** | **✅ Preserved** |
| Cognito | FREE | ✅ Preserved |
| SES | FREE | ✅ Preserved |
| S3 | $0.02 | ✅ Preserved |
| DynamoDB | $1.25 | ✅ Preserved |

---

**Remember**: This optimization preserves all testing functionality while saving significant costs. You can always re-enable expensive resources when needed for production testing.
