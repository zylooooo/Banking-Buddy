variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "IDs of the public subnets for ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets for EC2 instances"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ID of the ALB security group"
  type        = string
}

variable "eb_security_group_id" {
  description = "ID of the Elastic Beanstalk security group"
  type        = string
}

variable "eb_instance_profile_name" {
  description = "Name of the EB instance profile"
  type        = string
}

variable "eb_service_role_arn" {
  description = "ARN of the Elastic Beanstalk service role"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "ec2_key_pair_name" {
  description = "EC2 key pair name for SSH access to EB instances"
  type        = string
}

variable "audit_sqs_queue_url" {
  description = "Audit SQS queue URL"
  type        = string
}

variable "redis_endpoint" {
  description = "Redis endpoint"
  type        = string
}

variable "openai_api_key_secret_name" {
  description = "Name of the OpenAI API key secret in Secrets Manager"
  type        = string
}

variable "client_service_endpoint" {
  description = "Client service endpoint URL"
  type        = string
}

variable "transaction_service_endpoint" {
  description = "Transaction service endpoint URL"
  type        = string
}

variable "user_service_endpoint" {
  description = "User service endpoint URL"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
  default     = {}
}