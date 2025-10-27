output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "sftp_server_instance_profile_name" {
  description = "Name of the SFTP server instance profile"
  value       = aws_iam_instance_profile.sftp_server.name
}

output "cognito_ses_role_arn" {
  description = "ARN of the Cognito SES role"
  value       = aws_iam_role.cognito_ses.arn
}

output "elastic_beanstalk_instance_profile_name" {
  description = "Name of the Elastic Beanstalk instance profile"
  value       = aws_iam_instance_profile.elastic_beanstalk.name
}

# Add these missing outputs
output "elastic_beanstalk_role_arn" {
  description = "ARN of the Elastic Beanstalk role"
  value       = aws_iam_role.elastic_beanstalk.arn
}

output "cognito_ses_role_name" {
  description = "Name of the Cognito SES role"
  value       = aws_iam_role.cognito_ses.name
}

output "cognito_sns_role_arn" {
  description = "ARN of the Cognito SNS role"
  value       = aws_iam_role.cognito_sns.arn
}

output "elastic_beanstalk_service_role_arn" {
  description = "ARN of the Elastic Beanstalk service role"
  value       = aws_iam_role.elastic_beanstalk_service.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM Role for CI/CD"
  value       = aws_iam_role.github_actions.arn
}
