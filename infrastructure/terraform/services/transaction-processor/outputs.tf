output "sftp_server_public_ip" {
  description = "Public IP of the SFTP server"
  value       = aws_instance.sftp_server.public_ip
}

output "sftp_server_private_ip" {
  description = "Private IP of the SFTP server"
  value       = aws_instance.sftp_server.private_ip
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.transaction_processor.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.transaction_processor.arn
}

output "lambda_function_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.transaction_processor.invoke_arn
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "cloudwatch_event_rule_name" {
  description = "Name of the CloudWatch event rule"
  value       = aws_cloudwatch_event_rule.daily_schedule.name
}

output "key_pair_name" {
  description = "Name of the EC2 key pair"
  value       = data.aws_key_pair.sftp_server.key_name
}