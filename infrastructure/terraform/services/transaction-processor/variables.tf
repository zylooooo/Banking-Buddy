variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "IDs of the public subnets"
  type        = list(string)
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "ec2_key_pair_name" {
  description = "Name of the EC2 key pair for SFTP server access"
  type        = string
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB"
  type        = number
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
}

variable "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  type        = string
}

variable "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  type        = string
}

variable "sftp_security_group_id" {
  description = "ID of the SFTP server security group"
  type        = string
}

variable "rds_security_group_id" {
  description = "ID of the RDS security group"
  type        = string
}

variable "sftp_instance_profile_name" {
  description = "Name of the SFTP server instance profile"
  type        = string
}

variable "rds_endpoint" {
  description = "RDS instance endpoint"
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

variable "rds_secret_name" {
  description = "Name of RDS credentials secret"
  type        = string
}

variable "sftp_secret_name" {
  description = "Name of SFTP credentials secret"
  type        = string
}

variable "audit_dynamodb_table_name" {
  description = "Name of the audit logs DynamoDB table"
  type        = string
  default     = ""
}
