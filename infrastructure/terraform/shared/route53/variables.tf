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

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}