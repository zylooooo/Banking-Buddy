variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "IDs of the public subnets"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ID of the ALB security group"
  type        = string
}

variable "rds_endpoint" {
  description = "RDS instance endpoint"
  type        = string
}

variable "rds_secret_name" {
  description = "Name of the RDS credentials secret"
  type        = string
}

variable "crm_db_username" {
  description = "Username for CRM database"
  type        = string
}

variable "crm_db_password" {
  description = "Password for CRM database"
  type        = string
  sensitive   = true
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}