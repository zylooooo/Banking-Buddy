variable "domain_name" {
  description = "Root domain name (e.g., bankingbuddy.com)"
  type        = string
}

variable "api_subdomain" {
  description = "Subdomain for API (e.g., api.bankingbuddy.com)"
  type        = string
}

variable "api_gateway_domain_name" {
  description = "API Gateway regional domain name"
  type        = string
}

variable "api_gateway_zone_id" {
  description = "API Gateway regional hosted zone ID"
  type        = string
}

variable "frontend_subdomain" {
  description = "Subdomain for frontend (e.g., app.bankingbuddy.com or www.bankingbuddy.com)"
  type        = string
  default     = ""
}

variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  type        = string
  default     = ""
}

variable "cloudfront_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}