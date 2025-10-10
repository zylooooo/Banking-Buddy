variable "private_subnet_ids" {
  description = "IDs of the private subnets"
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

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
}

variable "rds_security_group_id" {
  description = "ID of the RDS security group"
  type        = string
}

variable "db_name" {
  description = "Name of the database"
  type = string
}

variable "db_username" {
  description = "Database master username"
  type = string
  sensitive = true
}

variable "db_password" {
  description = "Database master password"
  type = string
  sensitive = true
}