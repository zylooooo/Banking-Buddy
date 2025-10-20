variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "ses_email_arn" {
  description = "ARN of the SES email identity"
  type        = string
}

variable "ses_sender_email" {
  description = "Sender email address for Cognito notifications"
  type        = string
}

variable "callback_urls" {
  description = "Callback URLs for OAuth (will include ALB DNS)"
  type        = list(string)
  default     = []
}

variable "logout_urls" {
  description = "Logout URLs for OAuth"
  type        = list(string)
  default     = []
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "cognito_sns_role_arn" {
  description = "ARN of the IAM role for Cognito to send SMS via SNS"
  type        = string
}
