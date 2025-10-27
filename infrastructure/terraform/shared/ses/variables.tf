variable "sender_email" {
  description = "Email address for sending Cognito notifications"
  type        = string
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}
