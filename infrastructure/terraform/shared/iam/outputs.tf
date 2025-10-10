output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "sftp_server_instance_profile_name" {
  description = "Name of the SFTP server instance profile"
  value       = aws_iam_instance_profile.sftp_server.name
}