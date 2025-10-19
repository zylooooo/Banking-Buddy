resource "random_string" "secret_suffix" {
  length  = 6
  special = false
  upper   = false
}

# RDS Credentials Secret
resource "aws_secretsmanager_secret" "rds_credentials" {
  name        = "${var.name_prefix}-rds-credentials-${random_string.secret_suffix.result}"
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
  name        = "${var.name_prefix}-sftp-credentials-${random_string.secret_suffix.result}"
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

# CRM Database Credentials Secret
resource "aws_secretsmanager_secret" "crm_db_credentials" {
  name        = "${var.name_prefix}-crm-db-credentials-${random_string.secret_suffix.result}"
  description = "CRM users database credentials"

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "crm_db_credentials" {
  secret_id = aws_secretsmanager_secret.crm_db_credentials.id
  secret_string = jsonencode({
    username = var.crm_db_username
    password = var.crm_db_password
    engine   = "mysql"
    host     = var.rds_endpoint
    port     = 3306
    dbname   = "crm_users"
  })
}
