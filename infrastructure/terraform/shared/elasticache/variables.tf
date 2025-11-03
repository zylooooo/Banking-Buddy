variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "database_subnet_ids" {
  description = "IDs of the database subnets (for RDS and ElastiCache isolation)"
  type        = list(string)
}

variable "redis_security_group_id" {
  description = "ID of the Redis security group"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}
