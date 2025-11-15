variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
}

variable "backup_retention_days" {
  description = "Number of days to retain daily backups"
  type        = number
  default     = 7
}

variable "weekly_backup_retention_days" {
  description = "Number of days to retain weekly backups"
  type        = number
  default     = 30
}

variable "backup_resources" {
  description = "List of resource ARNs to backup"
  type        = list(string)
}

