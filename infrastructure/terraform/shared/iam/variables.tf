variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the s3 bucket"
  type        = string
}

variable "rds_secret_arn" {
  description = "ARN of RDS credentials secret"
  type        = string
}

variable "sftp_secret_arn" {
  description = "ARN of SFTP credentials secret"
  type        = string
}

variable "ses_email_arn" {
  description = "ARN of the SES email identity"
  type        = string
}

variable "crm_users_db_secret_arn" {
  description = "ARN of the CRM users database credentials secret"
  type        = string
}

variable "crm_transactions_db_secret_arn" {
  description = "ARN of the CRM transactions database credentials secret"
  type        = string
}

variable "crm_clients_db_secret_arn" {
  description = "ARN of CRM clients database credentials secret"
  type        = string
}

variable "audit_dynamodb_table_arn" {
  description = "ARN of the audit DynamoDB table (empty string to skip policy creation and break circular dependency)"
  type        = string
  default     = ""
}

variable "aws_region" {
  description = "AWS region"
  type        = string
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
