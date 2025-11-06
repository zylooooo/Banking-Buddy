# IAM Role for Lambda Reader
resource "aws_iam_role" "lambda_reader" {
  name = "${var.name_prefix}-audit-reader-lambda-role"

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

# CloudWatch Logs for Lambda Reader
resource "aws_iam_role_policy_attachment" "lambda_reader_logs" {
  role       = aws_iam_role.lambda_reader.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB Read permissions for Lambda Reader
resource "aws_iam_role_policy" "lambda_reader_dynamodb" {
  name = "${var.name_prefix}-audit-reader-dynamodb"
  role = aws_iam_role.lambda_reader.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:Scan"
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
resource "null_resource" "audit_reader_package_builder" {
  triggers = {
    requirements = filemd5("${path.module}/lambda/audit-reader/requirements.txt")
    lambda       = filemd5("${path.module}/lambda/audit-reader/lambda_function.py")
    dockerfile   = filemd5("${path.module}/lambda/audit-reader/Dockerfile.build")
  }

  provisioner "local-exec" {
    command     = "docker build -f ${path.module}/lambda/audit-reader/Dockerfile.build -t lambda-builder-audit-reader ${path.module}/lambda/audit-reader && docker create --name lambda-temp-audit-reader lambda-builder-audit-reader && docker cp lambda-temp-audit-reader:/build/lambda-deployment-package.zip ${path.module}/lambda/audit-reader.zip && docker rm lambda-temp-audit-reader"
    working_dir = path.root
  }
}

# Lambda Function - Audit Reader
resource "aws_lambda_function" "audit_reader" {
  depends_on      = [null_resource.audit_reader_package_builder]
  filename        = "${path.module}/lambda/audit-reader.zip"
  source_code_hash = base64sha256("${filemd5("${path.module}/lambda/audit-reader/requirements.txt")}${filemd5("${path.module}/lambda/audit-reader/lambda_function.py")}${filemd5("${path.module}/lambda/audit-reader/Dockerfile.build")}")
  function_name   = "${var.name_prefix}-audit-reader"
  role            = aws_iam_role.lambda_reader.arn
  handler         = "lambda_function.lambda_handler"
  runtime         = "python3.12"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      DYNAMODB_TABLE_NAME  = var.dynamodb_table_name
      AGENT_INDEX_NAME     = "AgentIndex"
      OPERATION_INDEX_NAME = "OperationIndex"
    }
  }

  tags = merge(var.common_tags, {
    Name    = "${var.name_prefix}-audit-reader"
    Purpose = "Query audit logs from DynamoDB with role-based filtering"
  })
}

# CloudWatch Log Group for Lambda Reader
resource "aws_cloudwatch_log_group" "lambda_reader" {
  name              = "/aws/lambda/${aws_lambda_function.audit_reader.function_name}"
  retention_in_days = 7

  tags = var.common_tags
}
