# RDS Credentials Secret
resource "aws_secretsmanager_secret" "rds_credentials" {
  name        = "${var.name_prefix}-rds-credentials"
  description = "RDS MySQL database credentials"

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "rds_credentials" {
  secret_id = aws_secretsmanager_secret.rds_credentials.id
  secret_string = jsonencode({
    username = var.rds_username
    password = var.rds_password
    engine   = "mysql"
    host     = var.rds_endpoint
    port     = 3306
    dbname   = var.rds_database_name
  })
}

# SFTP Credentials secret
resource "aws_secretsmanager_secret" "sftp_credentials" {
  name        = "${var.name_prefix}-sftp-credentials"
  description = "SFTP server credentials"

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "sftp_credentials" {
  secret_id = aws_secretsmanager_secret.sftp_credentials.id
  secret_string = jsonencode({
    username = var.sftp_username
    password = var.sftp_password
  })
}
