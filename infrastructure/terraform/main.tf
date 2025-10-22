# Call VPC module
module "vpc" {
  source = "./shared/vpc"

  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  common_tags        = local.common_tags
  vpc_name           = local.vpc_name
  name_prefix        = local.name_prefix
}

# Call Security Groups module
module "security_groups" {
  source = "./shared/security-groups"

  vpc_id                = module.vpc.vpc_id
  vpc_cidr              = module.vpc.vpc_cidr_block
  nat_gateway_public_ip = module.vpc.nat_gateway_public_ip
  developer_ips         = var.developer_ips
  common_tags           = local.common_tags
  name_prefix           = local.name_prefix
}

# Call the IAM module
module "iam" {
  source = "./shared/iam"

  common_tags              = local.common_tags
  name_prefix              = local.name_prefix
  s3_bucket_name           = module.s3.bucket_name
  rds_secret_arn           = module.secrets-manager.rds_secret_arn
  sftp_secret_arn          = module.secrets-manager.sftp_secret_arn
  crm_db_secret_arn        = module.secrets-manager.crm_db_secret_arn
  # audit_dynamodb_table_arn removed to break circular dependency with cognito
  # audit_dynamodb_table_arn = module.audit_logging.dynamodb_table_arn

  ses_email_arn         = module.ses.sender_email_arn

  depends_on = [module.secrets-manager, module.ses]
}

# Call the RDS module
module "rds" {
  source = "./shared/rds"

  private_subnet_ids    = module.vpc.private_subnet_ids
  common_tags           = local.common_tags
  name_prefix           = local.name_prefix
  db_instance_class     = var.db_instance_class
  db_allocated_storage  = var.db_allocated_storage
  rds_security_group_id = module.security_groups.rds_id
  db_name               = var.rds_database_name
  db_username           = var.rds_username
  db_password           = var.rds_password
  environment           = var.environment
}

# Call the s3 module
module "s3" {
  source = "./shared/s3"

  common_tags = local.common_tags
  name_prefix = local.name_prefix
}

# Call the secrets manager module
module "secrets-manager" {
  source = "./shared/secrets-manager"

  common_tags       = local.common_tags
  name_prefix       = local.name_prefix
  rds_username      = var.rds_username
  rds_password      = var.rds_password
  rds_endpoint      = module.rds.rds_endpoint
  rds_database_name = var.rds_database_name
  sftp_username     = var.sftp_username
  sftp_password     = var.sftp_password
  crm_db_username   = var.crm_db_username
  crm_db_password   = var.crm_db_password

  depends_on = [module.rds]
}

# Call the audit logging module
module "audit_logging" {
  source = "./shared/audit-logging"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  common_tags        = local.common_tags
  name_prefix        = local.name_prefix

  dynamodb_read_capacity  = var.audit_dynamodb_read_capacity
  dynamodb_write_capacity = var.audit_dynamodb_write_capacity
  log_retention_days      = var.audit_log_retention_days

  # API Gateway Cognito authorization
  cognito_user_pool_id        = module.cognito.user_pool_id
  cognito_user_pool_client_id = module.cognito.user_pool_client_id
  aws_region                  = data.aws_region.current.name
  allowed_origins             = var.audit_api_allowed_origins

  depends_on = [module.cognito]
}

# Call the transaction processor module
module "transaction-processor" {
  source = "./services/transaction-processor"

  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  public_subnet_ids          = module.vpc.public_subnet_ids
  common_tags                = local.common_tags
  name_prefix                = local.name_prefix
  lambda_memory_size         = var.lambda_memory_size
  lambda_timeout             = var.lambda_timeout
  lambda_execution_role_arn  = module.iam.lambda_execution_role_arn
  lambda_security_group_id   = module.security_groups.lambda_id
  sftp_security_group_id     = module.security_groups.sftp_server_id
  rds_security_group_id      = module.security_groups.rds_id
  sftp_instance_profile_name = module.iam.sftp_server_instance_profile_name
  rds_endpoint               = module.rds.rds_endpoint
  s3_bucket_name             = module.s3.bucket_name
  rds_secret_arn             = module.secrets-manager.rds_secret_arn
  sftp_secret_arn            = module.secrets-manager.sftp_secret_arn
  rds_secret_name            = module.secrets-manager.rds_secret_name
  sftp_secret_name           = module.secrets-manager.sftp_secret_name
  ec2_key_pair_name          = var.ec2_key_pair_name
  audit_dynamodb_table_name  = module.audit_logging.dynamodb_table_name

  depends_on = [
    module.secrets-manager,
    module.audit_logging
  ]
}

# Call the SES module
module "ses" {
  source = "./shared/ses"

  sender_email = var.ses_sender_email
  name_prefix  = local.name_prefix
}

# Call the Cognito module
module "cognito" {
  source = "./shared/cognito"

  name_prefix      = local.name_prefix
  ses_email_arn    = module.ses.sender_email_arn
  ses_sender_email = module.ses.sender_email
  cognito_sns_role_arn = module.iam.cognito_sns_role_arn
  callback_urls    = ["http://localhost:3000/callback"] # Will be updated after ALB is created
  logout_urls      = ["http://localhost:3000"]          # Will be updated after ALB is created
  common_tags      = local.common_tags
  environment      = var.environment

  depends_on = [module.ses, module.iam]
}

# Call the user-service module
module "user-service" {
  source = "./services/user-service"

  name_prefix           = local.name_prefix
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.security_groups.alb_id
  rds_endpoint          = module.rds.rds_endpoint
  rds_secret_name       = module.secrets-manager.rds_secret_name
  crm_db_username       = var.crm_db_username
  crm_db_password       = var.crm_db_password
  common_tags           = local.common_tags

  depends_on = [module.cognito, module.security_groups]
}
