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
  type = string
  default = "banking-buddy-dev"
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
  type = string
  sensitive = true
}

variable "rds_password" {
  description = "RDS database password"
  type = string
  sensitive = true
}

variable "rds_database_name" {
  description = "RDS database name"
  type = string
  default = "transactions"
}

variable "sftp_username" {
  description = "SFTP username"
  type = string
  default = "sftpuser"
  sensitive = true
}
  
variable "sftp_password" {
  description = "SFTP password"
  type = string
  sensitive = true
}

# Developer IPs for SSH access
variable "developer_ips" {
  description = "List of public IPs for developer access"
  type        = list(string)
  default     = []
}