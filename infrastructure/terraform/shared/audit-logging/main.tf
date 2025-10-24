# Mission-Critical Audit Logging Infrastructure
# This module creates the SQS queues, Lambda functions, and API Gateway for audit logging
# Architecture: Services -> SQS Queue -> Lambda Writer -> DynamoDB (managed by separate dynamodb module)
# See sqs.tf for queue configuration and lambda-writer.tf for Lambda consumer

# IAM policy for Lambda Writer to write to DynamoDB
# Note: Services should use sqs_publish_policy (see sqs.tf) to publish to SQS, not write directly to DynamoDB
resource "aws_iam_policy" "audit_dynamodb_write_policy" {
  name        = "${var.name_prefix}-audit-dynamodb-write-policy"
  description = "Policy for Lambda Writer to write audit logs to DynamoDB (used by Lambda execution role)"

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

  tags = var.common_tags
}