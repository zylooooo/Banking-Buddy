output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = module.vpc.internet_gateway_id
}

output "transaction_processor_sftp_public_ip" {
  description = "SFTP server public IP"
  value       = module.transaction-processor.sftp_server_public_ip
}

output "transaction_processor_lambda_name" {
  description = "Transaction processor Lambda function name"
  value       = module.transaction-processor.lambda_function_name
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.rds_endpoint
}

# SES Outputs
output "ses_sender_email" {
  description = "SES sender email address"
  value       = module.ses.sender_email
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool domain"
  value       = module.cognito.user_pool_domain_full
}

# User Service Outputs
output "user_service_alb_dns" {
  description = "DNS name of the User Service ALB"
  value       = module.user-service.alb_dns_name
}

# Audit logging outputs
output "audit_logs_dynamodb_table_name" {
  description = "Name of the audit logs DynamoDB table"
  value       = module.dynamodb.table_name
}

output "audit_dynamodb_write_policy_arn" {
  description = "ARN of the IAM policy for writing audit logs to DynamoDB"
  value       = module.audit_logging.audit_dynamodb_write_policy_arn
}

output "audit_sqs_queue_url" {
  description = "URL of the audit logs SQS queue"
  value       = module.audit_logging.sqs_queue_url
}

output "audit_sqs_publish_policy_arn" {
  description = "ARN of the IAM policy for publishing to audit SQS queue"
  value       = module.audit_logging.sqs_publish_policy_arn
}

output "audit_api_gateway_endpoint" {
  description = "API Gateway endpoint URL for querying audit logs"
  value       = module.audit_logging.api_gateway_endpoint
}

# Cognito Outputs
output "cognito_hosted_ui_url" {
  description = "Cognito Hosted UI URL"
  value       = module.cognito.hosted_ui_url
}

output "cognito_domain" {
  description = "Cognito domain name"
  value       = module.cognito.user_pool_domain
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.redis_endpoint
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = module.elasticache.redis_reader_endpoint
}

# User Service Outputs
output "user_service_endpoint" {
  description = "Full endpoint URL for User Service"
  value       = module.user-service.endpoint_url
}

# API Gateway Outputs
output "api_gateway_endpoint" {
  description = "API Gateway default endpoint"
  value       = module.api_gateway.api_gateway_endpoint
}

output "api_custom_domain" {
  description = "Custom domain for API (empty if not configured)"
  value       = module.api_gateway.custom_domain_name
}

output "api_full_endpoint" {
  description = "Full API endpoint (custom domain if configured, otherwise default)"
  value       = var.root_domain_name != "" ? module.api_gateway.full_api_endpoint : module.api_gateway.api_gateway_endpoint
}

# WAF Outputs
output "waf_web_acl_id" {
  description = "WAF Web ACL ID"
  value       = module.waf.web_acl_id
}

# Route53 Outputs (only available if custom domain is configured)
output "route53_api_record" {
  description = "Route53 API record name (null if custom domain not configured)"
  value       = var.root_domain_name != "" ? module.route53[0].api_record_name : null
}

# Frontend Outputs
output "frontend_s3_bucket_name" {
  description = "Name of the frontend S3 bucket"
  value       = module.s3_frontend.bucket_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_distribution_domain" {
  description = "Domain name of the CloudFront distribution"
  value       = module.cloudfront.distribution_domain_name
}

output "frontend_url" {
  description = "Frontend URL (custom domain if configured, otherwise CloudFront domain)"
  value       = var.frontend_domain_name != "" ? "https://${var.frontend_domain_name}" : "https://${module.cloudfront.distribution_domain_name}"
}

output "route53_frontend_record" {
  description = "Route53 frontend record name (null if custom domain not configured)"
  value       = var.root_domain_name != "" && var.frontend_domain_name != "" ? module.route53[0].frontend_record_name : null
}