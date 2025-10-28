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
    host     = split(":", var.rds_endpoint)[0]
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

# CRM users database credentials secret (for user-service)
resource "aws_secretsmanager_secret" "crm_users_db_credentials" {
  name        = "${var.name_prefix}-crm-users-db-credentials-${random_string.secret_suffix.result}"
  description = "CRM users database credentials"

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "crm_users_db_credentials" {
  secret_id = aws_secretsmanager_secret.crm_users_db_credentials.id
  secret_string = jsonencode({
    username = var.crm_users_db_username
    password = var.crm_users_db_password
    engine   = "mysql"
    host     = split(":", var.rds_endpoint)[0]
    port     = 3306
    dbname   = "crm_users"
  })
}

resource "aws_secretsmanager_secret" "crm_transactions_db_credentials" {
  name        = "${var.name_prefix}-crm-transactions-db-credentials-${random_string.secret_suffix.result}"
  description = "CRM transactions database credentials"
  tags        = var.common_tags
}

resource "aws_secretsmanager_secret_version" "crm_transactions_db_credentials" {
  secret_id = aws_secretsmanager_secret.crm_transactions_db_credentials.id
  secret_string = jsonencode({
    username = var.crm_transactions_db_username
    password = var.crm_transactions_db_password
    engine   = "mysql"
    host     = split(":", var.rds_endpoint)[0]
    port     = 3306
    dbname   = "crm_transactions"
  })
}

# CRM Clients Database Credentials Secret
resource "aws_secretsmanager_secret" "crm_clients_db" {
  name        = "${var.name_prefix}-crm-clients-db-credentials"
  description = "CRM Clients database credentials"
  tags        = var.common_tags
}

resource "aws_secretsmanager_secret_version" "crm_clients_db" {
  secret_id = aws_secretsmanager_secret.crm_clients_db.id
  secret_string = jsonencode({
    username = var.crm_clients_db_username
    password = var.crm_clients_db_password
    engine   = "mysql"
    host     = split(":", var.rds_endpoint)[0]
    port     = 3306
    dbname   = "crm_clients"
  })
}
