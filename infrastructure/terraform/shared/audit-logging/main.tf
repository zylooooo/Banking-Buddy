# Mission-Critical Audit Logging Infrastructure
# This module creates only DynamoDB for direct synchronous logging

# DynamoDB table for storing audit logs
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

# IAM policy for services to write directly to DynamoDB
resource "aws_iam_policy" "audit_dynamodb_write_policy" {
  name        = "${var.name_prefix}-audit-dynamodb-write-policy"
  description = "Policy for services to write audit logs directly to DynamoDB"

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