variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets"
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
