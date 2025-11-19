# DynamoDB Module for Audit Logging
# This module creates a standalone DynamoDB table for audit logs
# Separated from audit-logging module to allow independent lifecycle management

resource "aws_dynamodb_table" "audit_logs" {
  name           = "${var.name_prefix}-audit-logs"
  billing_mode   = "PROVISIONED"
  read_capacity  = var.read_capacity
  write_capacity = var.write_capacity
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
    read_capacity   = var.read_capacity
    write_capacity  = var.write_capacity
    projection_type = "ALL"
  }

  # Global Secondary Index for querying by operation type
  global_secondary_index {
    name            = "OperationIndex"
    hash_key        = "crud_operation"
    range_key       = "timestamp"
    read_capacity   = var.read_capacity
    write_capacity  = var.write_capacity
    projection_type = "ALL"
  }

  # TTL for automatic log cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # CRITICAL: Prevent accidental deletion of audit logs
  # NOTE: Set to false when you need to destroy infrastructure
  # Set back to true after recreating for production protection
  lifecycle {
    prevent_destroy = false
  }

  tags = var.common_tags
}
