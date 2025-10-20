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

output "sqs_queue_url" {
  description = "URL of the audit logs SQS queue"
  value       = aws_sqs_queue.audit_logs.url
}

output "sqs_queue_arn" {
  description = "ARN of the audit logs SQS queue"
  value       = aws_sqs_queue.audit_logs.arn
}

output "sqs_publish_policy_arn" {
  description = "ARN of the IAM policy for publishing to audit logs SQS queue"
  value       = aws_iam_policy.sqs_publish_policy.arn
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL for querying audit logs"
  value       = aws_apigatewayv2_api.audit_logs_api.api_endpoint
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.audit_logs_api.id
}