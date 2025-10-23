# IAM Role for Lambda Writer
resource "aws_iam_role" "lambda_writer" {
  name = "${var.name_prefix}-audit-writer-lambda-role"

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

# CloudWatch Logs for Lambda Writer
resource "aws_iam_role_policy_attachment" "lambda_writer_logs" {
  role       = aws_iam_role.lambda_writer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# SQS Read permissions for Lambda Writer
resource "aws_iam_role_policy" "lambda_writer_sqs" {
  name = "${var.name_prefix}-audit-writer-sqs"
  role = aws_iam_role.lambda_writer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.audit_logs.arn
      }
    ]
  })
}

# DynamoDB Write permissions for Lambda Writer
resource "aws_iam_role_policy" "lambda_writer_dynamodb" {
  name = "${var.name_prefix}-audit-writer-dynamodb"
  role = aws_iam_role.lambda_writer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      }
    ]
  })
}

# Trigger build when source code changes
resource "null_resource" "audit_writer_package_builder" {
  triggers = {
    requirements    = filemd5("${path.module}/lambda/audit-writer/requirements.txt")
    lambda_function = filemd5("${path.module}/lambda/audit-writer/lambda_function.py")
    build_script    = filemd5("${path.module}/lambda/audit-writer/build.sh")
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/lambda/audit-writer && bash build.sh"
    working_dir = path.root
  }
}

# Lambda Function - Audit Writer
resource "aws_lambda_function" "audit_writer" {
  depends_on       = [null_resource.audit_writer_package_builder]
  filename         = "${path.module}/lambda/audit-writer.zip"
  function_name    = "${var.name_prefix}-audit-writer"
  role             = aws_iam_role.lambda_writer.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.12"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.module}/lambda/audit-writer.zip")

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = var.dynamodb_table_name
      MAX_RETRIES         = "3"
      LOG_RETENTION_DAYS  = tostring(var.log_retention_days)
    }
  }

  tags = merge(var.common_tags, {
    Name    = "${var.name_prefix}-audit-writer"
    Purpose = "Process audit log messages from SQS and write to DynamoDB"
  })
}

# Event Source Mapping - Connect SQS to Lambda
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.audit_logs.arn
  function_name    = aws_lambda_function.audit_writer.arn
  batch_size       = 10
  enabled          = true

  # Process messages in batches of up to 10
  # Failed batches will be retried automatically by Lambda
  function_response_types = ["ReportBatchItemFailures"]
}

# CloudWatch Log Group for Lambda Writer
resource "aws_cloudwatch_log_group" "lambda_writer" {
  name              = "/aws/lambda/${aws_lambda_function.audit_writer.function_name}"
  retention_in_days = 7

  tags = var.common_tags
}
