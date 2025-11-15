output "backup_vault_name" {
  description = "Name of the backup vault"
  value       = aws_backup_vault.main.name
}

output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = aws_backup_vault.main.arn
}

output "backup_plan_id" {
  description = "ID of the backup plan"
  value       = aws_backup_plan.main.id
}

output "backup_plan_arn" {
  description = "ARN of the backup plan"
  value       = aws_backup_plan.main.arn
}

output "backup_role_arn" {
  description = "ARN of the IAM role for AWS Backup"
  value       = aws_iam_role.backup_role.arn
}

