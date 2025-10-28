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

  common_tags                    = local.common_tags
  name_prefix                    = local.name_prefix
  s3_bucket_name                 = module.s3.bucket_name
  rds_secret_arn                 = module.secrets-manager.rds_secret_arn
  sftp_secret_arn                = module.secrets-manager.sftp_secret_arn
  crm_users_db_secret_arn        = module.secrets-manager.crm_users_db_secret_arn
  crm_transactions_db_secret_arn = module.secrets-manager.crm_transactions_db_secret_arn
  crm_clients_db_secret_arn      = module.secrets-manager.crm_clients_db_secret_arn
  aws_region                     = var.aws_region
  github_org                     = var.github_org
  github_repo                    = var.github_repo

  ses_email_arn = module.ses.sender_email_arn

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

  common_tags                  = local.common_tags
  name_prefix                  = local.name_prefix
  rds_username                 = var.rds_username
  rds_password                 = var.rds_password
  rds_endpoint                 = module.rds.rds_endpoint
  rds_database_name            = var.rds_database_name
  sftp_username                = var.sftp_username
  sftp_password                = var.sftp_password
  crm_users_db_username        = var.crm_users_db_username
  crm_users_db_password        = var.crm_users_db_password
  crm_transactions_db_username = var.crm_transactions_db_username
  crm_transactions_db_password = var.crm_transactions_db_password
  crm_clients_db_username      = var.crm_clients_db_username
  crm_clients_db_password      = var.crm_clients_db_password

  depends_on = [module.rds]
}

# Call the DynamoDB module (for audit logs)
module "dynamodb" {
  source = "./shared/dynamodb"

  name_prefix    = local.name_prefix
  read_capacity  = var.audit_dynamodb_read_capacity
  write_capacity = var.audit_dynamodb_write_capacity
  common_tags    = local.common_tags
}

# Call the audit logging module
module "audit_logging" {
  source = "./shared/audit-logging"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  common_tags        = local.common_tags
  name_prefix        = local.name_prefix

  # DynamoDB table (managed by separate module)
  dynamodb_table_name = module.dynamodb.table_name
  dynamodb_table_arn  = module.dynamodb.table_arn

  log_retention_days = var.audit_log_retention_days

  # API Gateway Cognito authorization
  cognito_user_pool_id        = module.cognito.user_pool_id
  cognito_user_pool_client_id = module.cognito.user_pool_client_id
  aws_region                  = var.aws_region
  allowed_origins             = var.audit_api_allowed_origins

  depends_on = [module.dynamodb]
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
  aws_region                 = var.aws_region

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
  aws_region   = var.aws_region
}

# Call the Cognito module
module "cognito" {
  source = "./shared/cognito"

  name_prefix          = local.name_prefix
  ses_email_arn        = module.ses.sender_email_arn
  ses_sender_email     = module.ses.sender_email
  cognito_sns_role_arn = module.iam.cognito_sns_role_arn
  callback_urls        = ["http://localhost:3000/callback"] # Will be updated after ALB is created
  logout_urls          = ["http://localhost:3000"]          # Will be updated after ALB is created
  common_tags          = local.common_tags
  environment          = var.environment
  aws_region           = var.aws_region

  depends_on = [module.ses, module.iam]
}

# Call the ElastiCache module
module "elasticache" {
  source = "./shared/elasticache"

  name_prefix             = local.name_prefix
  private_subnet_ids      = module.vpc.private_subnet_ids
  redis_security_group_id = module.security_groups.redis_id
  common_tags             = local.common_tags

  depends_on = [module.security_groups]
}

# Call the user-service module
module "user-service" {
  source = "./services/user-service"

  name_prefix              = local.name_prefix
  vpc_id                   = module.vpc.vpc_id
  public_subnet_ids        = module.vpc.public_subnet_ids
  private_subnet_ids       = module.vpc.private_subnet_ids
  alb_security_group_id    = module.security_groups.alb_id
  eb_security_group_id     = module.security_groups.elastic_beanstalk_id
  eb_instance_profile_name = module.iam.elastic_beanstalk_instance_profile_name
  eb_service_role_arn      = module.iam.elastic_beanstalk_service_role_arn
  rds_endpoint             = module.rds.rds_endpoint
  rds_secret_name          = module.secrets-manager.rds_secret_name
  crm_users_db_secret_name = module.secrets-manager.crm_users_db_secret_name
  aws_region               = var.aws_region
  cognito_user_pool_id     = module.cognito.user_pool_id
  cognito_client_id        = module.cognito.user_pool_client_id
  root_admin_email         = var.root_admin_email
  audit_sqs_queue_url      = module.audit_logging.sqs_queue_url
  redis_endpoint           = module.elasticache.redis_endpoint
  ec2_key_pair_name        = var.ec2_key_pair_name
  common_tags              = local.common_tags

  depends_on = [module.cognito, module.security_groups, module.elasticache]
}

# Call the transaction service module
module "transaction-service" {
  source = "./services/transaction-service"

  name_prefix                     = local.name_prefix
  vpc_id                          = module.vpc.vpc_id
  public_subnet_ids               = module.vpc.public_subnet_ids
  private_subnet_ids              = module.vpc.private_subnet_ids
  alb_security_group_id           = module.security_groups.alb_id
  eb_security_group_id            = module.security_groups.elastic_beanstalk_id
  eb_instance_profile_name        = module.iam.elastic_beanstalk_instance_profile_name
  eb_service_role_arn             = module.iam.elastic_beanstalk_service_role_arn
  rds_endpoint                    = module.rds.rds_endpoint
  rds_secret_name                 = module.secrets-manager.rds_secret_name
  crm_transactions_db_secret_name = module.secrets-manager.crm_transactions_db_secret_name
  aws_region                      = var.aws_region
  audit_sqs_queue_url             = module.audit_logging.sqs_queue_url
  redis_endpoint                  = module.elasticache.redis_endpoint
  ec2_key_pair_name               = var.ec2_key_pair_name
  common_tags                     = local.common_tags

  depends_on = [module.security_groups, module.elasticache]
}

# Call the client service module
module "client-service" {
  source = "./services/client-service"

  name_prefix                = local.name_prefix
  vpc_id                     = module.vpc.vpc_id
  public_subnet_ids          = module.vpc.public_subnet_ids
  private_subnet_ids         = module.vpc.private_subnet_ids
  alb_security_group_id      = module.security_groups.alb_id
  eb_security_group_id       = module.security_groups.elastic_beanstalk_id
  eb_instance_profile_name   = module.iam.elastic_beanstalk_instance_profile_name
  eb_service_role_arn        = module.iam.elastic_beanstalk_service_role_arn
  rds_endpoint               = module.rds.rds_endpoint
  crm_clients_db_secret_name = module.secrets-manager.crm_clients_db_secret_name
  aws_region                 = var.aws_region
  audit_sqs_queue_url        = module.audit_logging.sqs_queue_url
  redis_endpoint             = module.elasticache.redis_endpoint
  ec2_key_pair_name          = var.ec2_key_pair_name
  common_tags                = local.common_tags

  depends_on = [module.security_groups, module.elasticache]
}

# Call the WAF module
module "waf" {
  source = "./shared/waf"

  name_prefix = local.name_prefix
  common_tags = local.common_tags
}

# Call the ACM module for API Gateway certificate (only if custom domain is configured)
module "acm" {
  count  = var.root_domain_name != "" ? 1 : 0
  source = "./shared/acm"

  domain_name     = var.root_domain_name
  route53_zone_id = var.route53_zone_id
  name_prefix     = local.name_prefix
  common_tags     = local.common_tags
}

# Call the API Gateway module
module "api_gateway" {
  source = "./shared/api-gateway"

  name_prefix                  = local.name_prefix
  environment                  = var.environment
  cognito_user_pool_arn        = module.cognito.user_pool_arn
  user_service_endpoint        = module.user-service.endpoint_url
  transaction_service_endpoint = module.transaction-service.endpoint_url
  client_service_endpoint      = module.client-service.endpoint_url
  api_domain_name              = var.api_domain_name
  certificate_arn              = var.root_domain_name != "" ? module.acm[0].certificate_arn : null
  waf_web_acl_arn              = module.waf.web_acl_arn
  common_tags                  = local.common_tags

  depends_on = [
    module.user-service, 
    module.transaction-service, 
    module.client-service, 
    module.cognito, 
    module.waf
  ]
}

# Call the Route53 module (only if custom domain is configured)
module "route53" {
  count  = var.root_domain_name != "" ? 1 : 0
  source = "./shared/route53"

  domain_name             = var.root_domain_name
  api_subdomain           = var.api_domain_name
  api_gateway_domain_name = module.api_gateway.custom_domain_regional_domain_name
  api_gateway_zone_id     = module.api_gateway.custom_domain_regional_zone_id
  common_tags             = local.common_tags

  depends_on = [module.api_gateway]
}
