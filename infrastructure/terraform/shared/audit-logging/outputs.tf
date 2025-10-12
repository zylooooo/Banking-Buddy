output "dynamodb_table_name" {
  description = "Name of the audit logs DynamoDB table"
  value       = aws_dynamodb_table.audit_logs.name
}

output "dynamodb_table_arn" {
  description = "ARN of the audit logs DynamoDB table"
  value       = aws_dynamodb_table.audit_logs.arn
}

output "audit_dynamodb_write_policy_arn" {
  description = "ARN of the IAM policy for writing audit logs to DynamoDB"
  value       = aws_iam_policy.audit_dynamodb_write_policy.arn
}