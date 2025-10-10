variable "rds_secret_arn" {
  description = "ARN of RDS credentials secret"
  type = string
}

variable "sftp_secret_arn" {
  description = "ARN of SFTP credentials secret"
  type = string
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

