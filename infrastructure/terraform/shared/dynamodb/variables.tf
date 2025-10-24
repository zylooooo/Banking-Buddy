variable "name_prefix" {
  description = "Prefix for naming resources"
  type        = string
}

variable "read_capacity" {
  description = "DynamoDB read capacity units"
  type        = number
  default     = 5
}

variable "write_capacity" {
  description = "DynamoDB write capacity units"
  type        = number
  default     = 5
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
