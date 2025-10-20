data "aws_caller_identity" "current" {}
data "aws_region" "current" {}  

# Lambda Execution Role
resource "aws_iam_role" "lambda_execution" {
  name = "${var.name_prefix}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Lambda Execution Policy
resource "aws_iam_role_policy" "lambda_execution" {
  name = "${var.name_prefix}-lambda-execution-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          var.rds_secret_arn,
          var.sftp_secret_arn
        ]
      }
    ]
  })
}

# SFTP Server IAM Role
resource "aws_iam_role" "sftp_server" {
  name = "${var.name_prefix}-sftp-server-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# SFTP S3 permissions
resource "aws_iam_role_policy" "sftp_s3_access" {
  name = "${var.name_prefix}-sftp-s3-access"
  role = aws_iam_role.sftp_server.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      }
    ]
  })
}

# SFTP Server IAM Policy for Secrets Manager
resource "aws_iam_role_policy" "sftp_secrets_access" {
  name = "${var.name_prefix}-sftp-secrets-access"
  role = aws_iam_role.sftp_server.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.sftp_secret_arn
      }
    ]
  })
}

# SFTP Server Instance Profile
resource "aws_iam_instance_profile" "sftp_server" {
  name = "${var.name_prefix}-sftp-server-profile"
  role = aws_iam_role.sftp_server.name

  tags = var.common_tags
}

# Elastic Beanstalk Policy for Audit DynamoDB Access (Mission-Critical)
resource "aws_iam_role_policy" "elastic_beanstalk_audit_dynamodb" {
  name = "${var.name_prefix}-elastic-beanstalk-audit-dynamodb"
  role = aws_iam_role.elastic_beanstalk.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem"
        ]
        Resource = var.audit_dynamodb_table_arn
      }
    ]
  })
}

# IAM Role for Cognito to send emails via SES
resource "aws_iam_role" "cognito_ses" {
  name = "${var.name_prefix}-cognito-ses-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

#Policy for Cognito to send emails via SES
resource "aws_iam_role_policy" "cognito_ses" {
  name = "${var.name_prefix}-cognito-ses-policy"
  role = aws_iam_role.cognito_ses.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = var.ses_email_arn
      }
    ]
  })
}

# Elastic Beanstalk IAM Role
resource "aws_iam_role" "elastic_beanstalk" {
  name = "${var.name_prefix}-elastic-beanstalk-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Elastic Beanstalk Instance Profile
resource "aws_iam_instance_profile" "elastic_beanstalk" {
  name = "${var.name_prefix}-elastic-beanstalk-profile"
  role = aws_iam_role.elastic_beanstalk.name

  tags = var.common_tags
}

# Elastic Beanstalk Policy for CRM Database Access
resource "aws_iam_role_policy" "elastic_beanstalk_crm_db" {
  name = "${var.name_prefix}-elastic-beanstalk-crm-db"
  role = aws_iam_role.elastic_beanstalk.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.crm_db_secret_arn
      }
    ]
  })
}

# Elastic Beanstalk Policy for Cognito Access
resource "aws_iam_role_policy" "elastic_beanstalk_cognito" {
  name = "${var.name_prefix}-elastic-beanstalk-cognito"
  role = aws_iam_role.elastic_beanstalk.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminUserGlobalSignOut",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:ForgotPassword",
          "cognito-idp:ConfirmForgotPassword"
        ]
        Resource = "arn:aws:cognito-idp:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:userpool/*"
      }
    ]
  })
}

# Elastic Beanstalk Policy for CloudWatch Logs
resource "aws_iam_role_policy" "elastic_beanstalk_logs" {
  name = "${var.name_prefix}-elastic-beanstalk-logs"
  role = aws_iam_role.elastic_beanstalk.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# IAM Role for Cognito to send SMS via SNS
resource "aws_iam_role" "cognito_sns" {
  name = "${var.name_prefix}-cognito-sns-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Policy for Cognito to sens SMS via SNS
resource "aws_iam_role_policy" "cognito_sns" {
  name = "${var.name_prefix}-cognito-sns-policy"
  role = aws_iam_role.cognito_sns.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = "*"
      }
    ]
  })
}
