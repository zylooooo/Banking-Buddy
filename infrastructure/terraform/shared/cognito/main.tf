# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.name_prefix}-user-pool"

  # Use email as username
  username_attributes      = ["email"]
  auto_verified_attributes = ["email", "phone_number"]

  # Only admins can create users
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # CRITICAL: Prevent destruction of user pool (contains all users!)
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      # Ignore schema changes to prevent recreation
      schema,
    ]
  }

  schema {
    name                = "given_name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "family_name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "phone_number"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  # Custom attribute for role (admin/agent)
  schema {
    name                     = "role"
    attribute_data_type      = "String"
    mutable                  = true
    developer_only_attribute = false # Important: allows admin updates

    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # MFA configuration (optional per user)
  mfa_configuration = "OPTIONAL"

  # SMS MFA configuration 
  sms_configuration {
    external_id    = "banking-buddy-sms-external-id"
    sns_caller_arn = var.cognito_sns_role_arn
  }

  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 2
    }
  }

  # Email configuration using SES
  email_configuration {
    email_sending_account  = "DEVELOPER"
    source_arn             = var.ses_email_arn
    from_email_address     = var.ses_sender_email
    reply_to_email_address = var.ses_sender_email
  }

  # User attributes that can be modified
  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email", "phone_number"]
  }

  # Deletion protection
  deletion_protection = var.environment == "prod" ? "ACTIVE" : "INACTIVE"

  tags = var.common_tags
}

# Cognito User Pool Domain (for hosted UI)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.name_prefix}-auth"
  user_pool_id = aws_cognito_user_pool.main.id

  # CRITICAL: Prevent destruction to avoid user pool recreation
  lifecycle {
    prevent_destroy = true
  }
}

# Cognito User Pool Client (for application)
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.name_prefix}-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # DO NOT generate client secret - frontend apps (React/Vite) cannot use secrets
  # Client secrets are only for server-side applications
  generate_secret = false

  # CRITICAL: Prevent destruction of app client (would break all authentication!)
  lifecycle {
    prevent_destroy = true
  }

  # Token validity
  id_token_validity      = 60 # 1 hour
  access_token_validity  = 60 # 1 hour
  refresh_token_validity = 30 # 30 days

  token_validity_units {
    id_token      = "minutes"
    access_token  = "minutes"
    refresh_token = "days"
  }

  # OAuth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Prevent user from updating their own role
  read_attributes = [
    "email",
    "email_verified",
    "given_name",
    "family_name",
    "custom:role",
    "phone_number",
    "phone_number_verified"
  ]

  write_attributes = [
    "email",
    "given_name",
    "family_name",
    "phone_number"
    # Note: custom:role is NOT in write_attributes
  ]

  # OAuth scopes for ALB integration and API Gateway
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = [
    "openid",
    "email",
    "phone",
    "profile",
    "aws.cognito.signin.user.admin"
  ]

  supported_identity_providers = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # Prevent errors when user doesn't exist
  prevent_user_existence_errors = "ENABLED"
}

resource "aws_cognito_user_pool_ui_customization" "main" {
  user_pool_id = aws_cognito_user_pool.main.id
  client_id    = aws_cognito_user_pool_client.main.id

  css = file("${path.module}/hosted-ui.css")

  # CRITICAL: Prevent destruction
  lifecycle {
    prevent_destroy = true
  }

  depends_on = [aws_cognito_user_pool_domain.main]
}
