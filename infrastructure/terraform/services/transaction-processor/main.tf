# Get latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_region" "current" {}

# Reference existing key pair
data "aws_key_pair" "sftp_server" {
  key_name = var.ec2_key_pair_name
}

# Data source for secret name
data "aws_secretsmanager_secret" "sftp_credentials" {
  name = var.sftp_secret_name
}

# Null resource to ensure secret is ready
data "aws_secretsmanager_secret_version" "sftp_credentials" {
  secret_id = data.aws_secretsmanager_secret.sftp_credentials.id
}

# Transaction data file
resource "aws_s3_object" "transactions_data" {
  bucket = var.s3_bucket_name
  key    = "transaction-processor/transactions.csv"
  source = "${path.module}/../../../sftp-server/data/transactions.csv"

  tags = var.common_tags
}

# SFTP Server EC2 Instance
resource "aws_instance" "sftp_server" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = data.aws_key_pair.sftp_server.key_name

  subnet_id                   = var.public_subnet_ids[0]
  vpc_security_group_ids      = [var.sftp_security_group_id]
  associate_public_ip_address = true

  user_data = templatefile("${path.module}/sftp-setup.sh", {
    s3_bucket_name   = var.s3_bucket_name
    sftp_secret_name = data.aws_secretsmanager_secret.sftp_credentials.name
    aws_region       = var.aws_region
  })

  depends_on = [
    aws_s3_object.transactions_data,
    data.aws_secretsmanager_secret_version.sftp_credentials
  ]

  iam_instance_profile = var.sftp_instance_profile_name

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-sftp-server"
  })
}

# Trigger build when source code changes
resource "null_resource" "lambda_package_builder" {
  triggers = {
    requirements = filemd5("${path.root}/../../services/transaction-processor/requirements.txt")
    lambda       = filemd5("${path.root}/../../services/transaction-processor/src/lambda_function.py")
    config       = filemd5("${path.root}/../../services/transaction-processor/src/config.py")
    sftp         = filemd5("${path.root}/../../services/transaction-processor/src/sftp_client.py")
    database     = filemd5("${path.root}/../../services/transaction-processor/src/database_client.py")
    validator    = filemd5("${path.root}/../../services/transaction-processor/src/transaction_validator.py")
  }

  provisioner "local-exec" {
    command     = "docker build -f ../../services/transaction-processor/Dockerfile.build -t lambda-builder ../../services/transaction-processor && docker create --name lambda-temp lambda-builder && docker cp lambda-temp:/build/lambda-deployment-package.zip ./services/transaction-processor/lambda-deployment-package.zip && docker rm lambda-temp"
    working_dir = path.root
  }
}

# Lambda Function
resource "aws_lambda_function" "transaction_processor" {
  filename      = "${path.module}/lambda-deployment-package.zip"
  function_name = "${var.name_prefix}-transaction-processor"
  role          = var.lambda_execution_role_arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      SFTP_HOST        = aws_instance.sftp_server.public_ip
      SFTP_PORT        = "22"
      SFTP_REMOTE_FILE = "/data/transactions.csv"
      SFTP_LOCAL_FILE  = "/tmp/transactions.csv"
      DB_HOST          = split(":", var.rds_endpoint)[0]
      DB_PORT          = "3306"
      # Secret ARNs for runtime retrieval
      RDS_SECRET_NAME  = var.rds_secret_name
      SFTP_SECRET_NAME = var.sftp_secret_name
      # Audit logging
      AUDIT_DYNAMODB_TABLE_NAME = var.audit_dynamodb_table_name
    }
  }
  depends_on = [
    aws_cloudwatch_log_group.lambda,
    null_resource.lambda_package_builder
  ]

  tags = var.common_tags
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.name_prefix}-transaction-processor"
  retention_in_days = 14
  tags              = var.common_tags
}

# CloudWatch Event Rule (Daily Schedule)
resource "aws_cloudwatch_event_rule" "daily_schedule" {
  name                = "${var.name_prefix}-daily-schedule"
  description         = "Trigger Lambda daily at midnight Singapore time"
  schedule_expression = "cron(0 16 * * ? *)"
  tags                = var.common_tags
}

# CloudWatch Event Target
resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.daily_schedule.name
  target_id = "TriggerLambda"
  arn       = aws_lambda_function.transaction_processor.arn
}

# Lambda Permission for CloudWatch Events
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transaction_processor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_schedule.arn
}
