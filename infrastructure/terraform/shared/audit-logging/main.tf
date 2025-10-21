# Mission-Critical Audit Logging Infrastructure
# This module creates the DynamoDB table for async audit logging
# Architecture: Services -> SQS Queue -> Lambda Writer -> DynamoDB
# See sqs.tf for queue configuration and lambda-writer.tf for Lambda consumer

# DynamoDB table for storing audit logs (written by Lambda Writer)
resource "aws_dynamodb_table" "audit_logs" {
  name           = "${var.name_prefix}-audit-logs"
  billing_mode   = "PROVISIONED"
  read_capacity  = var.dynamodb_read_capacity
  write_capacity = var.dynamodb_write_capacity
  hash_key       = "client_id"
  range_key      = "timestamp"

  attribute {
    name = "client_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "agent_id"
    type = "S"
  }

  attribute {
    name = "crud_operation"
    type = "S"
  }

  # Global Secondary Index for querying by agent_id
  global_secondary_index {
    name            = "AgentIndex"
    hash_key        = "agent_id"
    range_key       = "timestamp"
    read_capacity   = var.dynamodb_read_capacity
    write_capacity  = var.dynamodb_write_capacity
    projection_type = "ALL"
  }

  # Global Secondary Index for querying by operation type
  global_secondary_index {
    name            = "OperationIndex"
    hash_key        = "crud_operation"
    range_key       = "timestamp"
    read_capacity   = var.dynamodb_read_capacity
    write_capacity  = var.dynamodb_write_capacity
    projection_type = "ALL"
  }

  # TTL for automatic log cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = var.common_tags
}

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
          aws_dynamodb_table.audit_logs.arn,
          "${aws_dynamodb_table.audit_logs.arn}/index/*"
        ]
      }
    ]
  })

  tags = var.common_tags
}