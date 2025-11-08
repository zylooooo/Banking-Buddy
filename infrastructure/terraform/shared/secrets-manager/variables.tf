variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "rds_username" {
  description = "RDS database username"
  type        = string
  sensitive   = true
}

variable "rds_password" {
  description = "RDS database password"
  type        = string
  sensitive   = true
}

variable "rds_endpoint" {
  description = "RDS endpoint"
  type        = string
}

variable "rds_database_name" {
  description = "RDS database name"
  type        = string
}

variable "sftp_username" {
  description = "SFTP username"
  type        = string
  sensitive   = true
}

variable "sftp_password" {
  description = "SFTP password"
  type        = string
  sensitive   = true
}

variable "crm_users_db_username" {
  description = "CRM users database username"
  type        = string
  sensitive   = true
}

variable "crm_users_db_password" {
  description = "CRM users database password"
  type        = string
  sensitive   = true
}

variable "crm_transactions_db_username" {
  description = "CRM transactions database username"
  type        = string
  sensitive   = true
}

variable "crm_transactions_db_password" {
  description = "CRM transactions database password"
  type        = string
  sensitive   = true
}

variable "crm_clients_db_username" {
  description = "CRM clients database username"
  type        = string
}

variable "crm_clients_db_password" {
  description = "CRM clients database password"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}