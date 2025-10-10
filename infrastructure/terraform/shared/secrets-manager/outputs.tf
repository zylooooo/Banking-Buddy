output "rds_secret_arn" {
    description = "ARN of the RDS credentials secret"
    value = aws_secretsmanager_secret.rds_credentials.arn
}

output "sftp_secret_arn" {
    description = "ARN of the SFTP credentials secret"
    value = aws_secretsmanager_secret.sftp_credentials.arn
}

output "rds_secret_name" {
    description = "Name of the RDS credentials secret"
    value = aws_secretsmanager_secret.rds_credentials.name
}

output "sftp_secret_name" {
    description = "Name of the SFTP credentials secret"
    value = aws_secretsmanager_secret.sftp_credentials.name
}
