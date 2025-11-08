data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_dynamodb_table" "audit_table" {
  name = "${var.name_prefix}-audit-logs"
}

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
# Made conditional to break circular dependency with cognito
resource "aws_iam_role_policy" "elastic_beanstalk_audit_dynamodb" {
  count = var.audit_dynamodb_table_arn != "" ? 1 : 0

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
        Resource = data.aws_dynamodb_table.audit_table.arn
      }
    ]
  })
}

# Elastic Beanstalk Policy for SQS Access (Audit Logging)
resource "aws_iam_role_policy" "elastic_beanstalk_sqs" {
  name = "${var.name_prefix}-elastic-beanstalk-sqs"
  role = aws_iam_role.elastic_beanstalk.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl"
        ]
        Resource = "arn:aws:sqs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${var.name_prefix}-audit-logs"
      }
    ]
  })
}

# Elastic Beanstalk Policy for SES Access (Email Sending)
resource "aws_iam_role_policy" "elastic_beanstalk_ses" {
  name = "${var.name_prefix}-elastic-beanstalk-ses"
  role = aws_iam_role.elastic_beanstalk.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/*"
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
        Resource = "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/*"
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

# Attach AWS Web Tier Managed Policy (INCLUDES all EB permissions)
resource "aws_iam_role_policy_attachment" "elastic_beanstalk_web_tier" {
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"
  role       = aws_iam_role.elastic_beanstalk.name
}

# Add service role for Elastic Beanstalk service itself
resource "aws_iam_role" "elastic_beanstalk_service" {
  name = "${var.name_prefix}-elastic-beanstalk-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "elasticbeanstalk.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Attach service role policy
resource "aws_iam_role_policy_attachment" "elastic_beanstalk_service" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth"
  role       = aws_iam_role.elastic_beanstalk_service.name
}

resource "aws_iam_role_policy_attachment" "elastic_beanstalk_service_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkService"
  role       = aws_iam_role.elastic_beanstalk_service.name
}

# Elastic Beanstalk Policy for Database Secrets Access
resource "aws_iam_role_policy" "elastic_beanstalk_secrets" {
  name = "${var.name_prefix}-elastic-beanstalk-secrets"
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
        Resource = [
          var.rds_secret_arn,
          var.crm_users_db_secret_arn,
          var.crm_transactions_db_secret_arn,
          var.crm_clients_db_secret_arn,
          var.openai_api_key_secret_arn
        ]
      }
    ]
  })
}

# Elastic Beanstalk Policy for CloudWatch Metrics (Health Reporting)
resource "aws_iam_role_policy" "elastic_beanstalk_metrics" {
  name = "${var.name_prefix}-elastic-beanstalk-metrics"
  role = aws_iam_role.elastic_beanstalk.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticbeanstalk:PutInstanceStatistics"
        ]
        Resource = "arn:aws:elasticbeanstalk:*:*:application/*"
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
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminUserGlobalSignOut",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:ForgotPassword",
          "cognito-idp:ConfirmForgotPassword",
          "cognito-idp:AdminResetUserPassword",
          "cognito-idp:AdminSetUserMFAPreference",
          "cognito-idp:AssociateSoftwareToken",
          "cognito-idp:VerifySoftwareToken",
          "cognito-idp:SetUserMFAPreference",
          "cognito-idp:AdminGetUser"
        ]
        Resource = "arn:aws:cognito-idp:${var.aws_region}:${data.aws_caller_identity.current.account_id}:userpool/*"
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

# GitHub Actions IAM Role for CI/CD Deployment
resource "aws_iam_role" "github_actions" {
  name = "${var.name_prefix}-github-actions"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
          }
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# Custom policy for GitHub Actions (Elastic Beanstalk + CloudWatch)
resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "${var.name_prefix}-github-actions-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticbeanstalk:*",
          "ec2:DescribeInstanceStatus",
          "ec2:DescribeInstances",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeVpcs",
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeLaunchConfigurations",
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeTargetHealth"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = [
          "arn:aws:s3:::elasticbeanstalk-*",
          "arn:aws:s3:::elasticbeanstalk-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogStreams",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach CloudWatch read-only for deployment verification
resource "aws_iam_role_policy_attachment" "github_actions_cloudwatch" {
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
  role       = aws_iam_role.github_actions.name
}
