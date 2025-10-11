locals {
  # Common tags applied to all resources
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.team_name
  }

  # Stable naming for most resources (no timestamps)
  name_prefix = "${var.project_name}-${var.environment}"

  # Resource naming
  vpc_name             = "${local.name_prefix}-vpc"
  nat_instance_name    = "${local.name_prefix}-nat-instance"
  rds_instance_name    = "${local.name_prefix}-rds-mysql"
  lambda_function_name = "${local.name_prefix}-transaction-processor"
  sftp_server_name     = "${local.name_prefix}-sftp-server"
}
