variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  type        = string
}

variable "origin_access_control_id" {
  description = "Origin Access Control ID for S3"
  type        = string
}

variable "custom_domain" {
  description = "Custom domain name for CloudFront (e.g., app.bankingbuddy.com)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for custom domain (must be in us-east-1)"
  type        = string
  default     = ""
}

variable "waf_web_acl_arn" {
  description = "ARN of WAF Web ACL to associate with CloudFront"
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}