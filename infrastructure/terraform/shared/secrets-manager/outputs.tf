output "rds_secret_arn" {
  description = "ARN of the RDS credentials secret"
  value       = aws_secretsmanager_secret.rds_credentials.arn
}

output "sftp_secret_arn" {
  description = "ARN of the SFTP credentials secret"
  value       = aws_secretsmanager_secret.sftp_credentials.arn
}

output "rds_secret_name" {
  description = "Name of the RDS credentials secret"
  value       = aws_secretsmanager_secret.rds_credentials.name
}

output "sftp_secret_name" {
  description = "Name of the SFTP credentials secret"
  value       = aws_secretsmanager_secret.sftp_credentials.name
}

output "crm_users_db_secret_arn" {
  description = "ARN of the CRM users database credentials secret"
  value       = aws_secretsmanager_secret.crm_users_db_credentials.arn
}

output "crm_users_db_secret_name" {
  description = "Name of the CRM users database credentials secret"
  value       = aws_secretsmanager_secret.crm_users_db_credentials.name
}

output "crm_transactions_db_secret_arn" {
  description = "ARN of the CRM transactions database credentials secret"
  value = aws_secretsmanager_secret.crm_transactions_db_credentials.arn
}

output "crm_transactions_db_secret_name" {
  description = "Name of the CRM transactions database credentials secret"
  value = aws_secretsmanager_secret.crm_transactions_db_credentials.name
}
