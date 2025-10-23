output "table_name" {
  description = "Name of the audit logs DynamoDB table"
  value       = aws_dynamodb_table.audit_logs.name
}

output "table_arn" {
  description = "ARN of the audit logs DynamoDB table"
  value       = aws_dynamodb_table.audit_logs.arn
}
