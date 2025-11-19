# Terraform Infrastructure Destruction Guide

## Overview

This guide explains the best practices for safely destroying the Banking Buddy infrastructure managed by Terraform.

## ⚠️ Important: prevent_destroy Configuration

The Terraform configuration has `prevent_destroy = false` by default, which allows infrastructure destruction. This is appropriate for development environments.

### For Production Environments

**Before deploying to production**, you **MUST** change `prevent_destroy = false` to `prevent_destroy = true` in the following files:

1. **Cognito Resources** (`shared/cognito/main.tf`):
   - User Pool (line 18)
   - User Pool Domain (line 122)
   - User Pool Client (line 139)
   - UI Customization (line 210)

2. **DynamoDB** (`shared/dynamodb/main.tf`):
   - Audit Logs Table (line 63)

**Why?** This prevents accidental deletion of critical resources containing user data and audit logs in production.

### For Infrastructure Destruction

If you need to destroy infrastructure and `prevent_destroy = true` is set, you must:

1. Change all `prevent_destroy = true` → `prevent_destroy = false` in the files listed above
2. Run `terraform destroy`
3. After recreating infrastructure, set `prevent_destroy = true` again for production protection

## Destruction Process

### Step 1: Review Destroy Plan

Always review what will be destroyed before executing:

```bash
cd infrastructure/terraform
terraform init
terraform plan -destroy -var-file=environments/dev.tfvars
```

**Review the plan carefully:**

- Verify all resources that will be destroyed
- Check for any unexpected deletions
- Note any resources that might fail (e.g., S3 buckets with objects)
- Ensure `prevent_destroy = false` is set (or you'll get an error)

### Step 2: Execute Destruction

```bash
terraform destroy -var-file=environments/dev.tfvars
```

**During destruction:**

- Terraform will prompt for confirmation: type `yes`
- Some resources may take time (CloudFront distributions, RDS instances)
- Monitor for any errors

### Step 3: Handle Manual Cleanup (if needed)

If `terraform destroy` fails or times out, you may need to manually clean up:

1. **S3 Buckets**: Empty buckets before deletion

   ```bash
   aws s3 rm s3://bucket-name --recursive
   ```

2. **CloudFront Distributions**: Wait for deployment to complete (can take 15-30 minutes)

3. **RDS Snapshots**: If `skip_final_snapshot = false`, final snapshots will be created automatically

4. **AWS Backup**: Backup vaults may need manual deletion

5. **Route53 Records**: If custom domain configured, DNS records may need cleanup

## Destruction Order (Automatic)

Terraform automatically handles dependencies and destroys resources in the correct order:

1. **Application Services** (Elastic Beanstalk, Lambda)
2. **API Gateway & CloudFront**
3. **Cognito & IAM**
4. **RDS & ElastiCache**
5. **DynamoDB**
6. **S3 Buckets**
7. **VPC & Networking**
8. **Security Groups**

## Conditional Deletion Protection

These resources have conditional protection based on environment (no manual changes needed):

- **RDS**: `deletion_protection = var.environment == "prod" ? true : false`
  - ✅ **Dev environment**: Protection is **disabled** (no action needed)

- **Cognito User Pool**: `deletion_protection = var.environment == "prod" ? "ACTIVE" : "INACTIVE"`
  - ✅ **Dev environment**: Protection is **inactive** (no action needed)

## Best Practices

### ✅ DO

1. **Always review the destroy plan** before executing
2. **Backup critical data** before destruction (RDS snapshots, S3 objects)
3. **Verify environment** is set to "dev" (not "prod") to avoid deletion protection
4. **Check AWS Console** after destruction to ensure all resources are removed
5. **Set `prevent_destroy = true`** when deploying to production
6. **Set `prevent_destroy = false`** when you need to destroy infrastructure

### ❌ DON'T

1. **Don't destroy production infrastructure** without proper authorization
2. **Don't skip the plan review** - always run `terraform plan -destroy` first
3. **Don't force destroy** with `-force` flag unless absolutely necessary
4. **Don't destroy during business hours** if infrastructure is in use
5. **Don't forget to clean up** manual resources created outside Terraform
6. **Don't deploy to production with `prevent_destroy = false`** - always set it to `true` for production

## Troubleshooting

### Error: "Resource cannot be destroyed because prevent_destroy is set"

**Solution**: Change `prevent_destroy = true` to `prevent_destroy = false` in the relevant files:

- `shared/cognito/main.tf` (4 locations)
- `shared/dynamodb/main.tf` (1 location)

### Error: "BucketNotEmpty: The bucket you tried to delete is not empty"

**Solution**: Empty the S3 bucket first:

```bash
aws s3 rm s3://bucket-name --recursive
# Then retry terraform destroy
```

### Error: "DependencyViolation" or "ResourceInUse"

**Solution**:

1. Check AWS Console for resources still in use
2. Wait for CloudFront distributions to fully deploy
3. Check for lingering ENIs, security groups, or IAM roles

### Error: "Timeout waiting for resource deletion"

**Solution**:

- Some resources (CloudFront, RDS) take 15-30 minutes
- Wait and retry, or manually delete via AWS Console

## Post-Destruction Checklist

- [ ] All resources removed from AWS Console
- [ ] Terraform state file cleaned up (if using local state)
- [ ] S3 state bucket cleaned up (if desired)
- [ ] Cost monitoring shows no unexpected charges
- [ ] DNS records cleaned up (if custom domain was used)

## Recreating Infrastructure

After destruction, to recreate:

1. **For Production**: Set `prevent_destroy = true` in all relevant files (see above)
2. Run `terraform apply -var-file=environments/dev.tfvars`
3. Infrastructure will be recreated in the same order as initial deployment

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] All `prevent_destroy` blocks are set to `true` in:
  - [ ] `shared/cognito/main.tf` (4 locations)
  - [ ] `shared/dynamodb/main.tf` (1 location)
- [ ] `environment` variable is set to `"prod"` in your tfvars file
- [ ] RDS `deletion_protection` will be enabled (automatic when `environment = "prod"`)
- [ ] Cognito `deletion_protection` will be active (automatic when `environment = "prod"`)

## Additional Resources

- [Terraform Destroy Documentation](https://www.terraform.io/docs/cli/commands/destroy.html)
- [AWS Resource Deletion Best Practices](https://docs.aws.amazon.com/general/latest/gr/aws_service_limits.html)
