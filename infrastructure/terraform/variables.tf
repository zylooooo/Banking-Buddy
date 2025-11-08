variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "banking-buddy"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "team_name" {
  description = "Team name for resource ownership"
  type        = string
  default     = "cs301-g2t1"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "ec2_key_pair_name" {
  description = "Name of the EC2 key pair for SFTP server access"
  type        = string
  default     = "banking-buddy-dev"
}

# Database configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated RDS storage in GB"
  type        = number
  default     = 100
}

# Lambda configuration
variable "lambda_memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 900 # 15 minutes
}

variable "rds_username" {
  description = "RDS database username"
  type        = string
  sensitive   = true
}

variable "rds_password" {
  description = "RDS database password"
  type        = string
  sensitive   = true
}

variable "rds_database_name" {
  description = "RDS database name"
  type        = string
  default     = "crm_transactions"
}

variable "sftp_username" {
  description = "SFTP username"
  type        = string
  default     = "sftpuser"
  sensitive   = true
}

variable "sftp_password" {
  description = "SFTP password"
  type        = string
  sensitive   = true
}

# Developer IPs for SSH access
variable "developer_ips" {
  description = "List of public IPs for developer access"
  type        = list(string)
  default     = []
}

# SES Configuration
variable "ses_sender_email" {
  description = "Email address for sending Cognito notifications"
  type        = string
}

# CRM Database Configuration
variable "crm_users_db_username" {
  description = "CRM users database username"
  type        = string
  default     = "crm_services_user"
  sensitive   = true
}

variable "crm_users_db_password" {
  description = "CRM users database password"
  type        = string
  sensitive   = true
}


# Audit logging configuration
variable "audit_dynamodb_read_capacity" {
  description = "DynamoDB read capacity units for audit logs table"
  type        = number
  default     = 5
}

variable "audit_dynamodb_write_capacity" {
  description = "DynamoDB write capacity units for audit logs table"
  type        = number
  default     = 5
}

variable "audit_log_retention_days" {
  description = "Number of days to retain audit logs"
  type        = number
  default     = 2555 # ~7 years for compliance
}

variable "audit_api_allowed_origins" {
  description = "Allowed CORS origins for audit API Gateway"
  type        = list(string)
  default     = ["*"]
}

variable "root_admin_email" {
  description = "Root admin email for initialization"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache nodes in the cluster"
  type        = number
  default     = 2
}

# Domain configuration for API Gateway (Optional - leave empty to use default API Gateway endpoint)
variable "root_domain_name" {
  description = "Root domain name (e.g., bankingbuddy.com). Leave empty to skip custom domain setup."
  type        = string
  default     = ""
}

variable "api_domain_name" {
  description = "Full API domain name (e.g., api.bankingbuddy.com). Leave empty to skip custom domain setup."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the domain. Leave empty to skip custom domain setup."
  type        = string
  default     = ""
}

variable "frontend_domain_name" {
  description = "Full frontend domain name (e.g., app.bankingbuddy.com or www.bankingbuddy.com). Leave empty to use CloudFront default domain."
  type        = string
  default     = ""
}

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = ""
}

variable "crm_transactions_db_username" {
  description = "CRM transactions database username"
  type        = string
  default     = "crm_transactions_user"
  sensitive   = true
}

variable "crm_transactions_db_password" {
  description = "CRM transactions database password"
  type        = string
  sensitive   = true
}

variable "crm_clients_db_username" {
  description = "CRM clients database username"
  type        = string
  default     = "crm_clients_user"
  sensitive   = true
}

variable "crm_clients_db_password" {
  description = "CRM clients database password"
  type        = string
  sensitive   = true
}

variable "ses_source_service" {
  description = "SES source service"
  type        = string
  default     = "client-service"
}

variable "openai_api_key" {
  description = "OpenAI API key for AI service"
  type        = string
  sensitive   = true
}