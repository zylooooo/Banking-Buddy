variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  type        = string
}

variable "user_service_endpoint" {
  description = "HTTP endpoint of the user service (without trailing slash)"
  type        = string
}

variable "transaction_service_endpoint" {
  description = "HTTP endpoint of the transaction service (without trailing slash)"
  type        = string
}

variable "client_service_endpoint" {
  description = "HTTP endpoint of the client service (without trailing slash)"
  type        = string
}

variable "api_domain_name" {
  description = "Custom domain name for API (e.g., api.bankingbuddy.com)"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = null
}

variable "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}
