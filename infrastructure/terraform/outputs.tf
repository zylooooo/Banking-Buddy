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
