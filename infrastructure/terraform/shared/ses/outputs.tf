output "sender_email" {
  description = "The verified sender email address"
  value       = aws_ses_email_identity.sender.email
}

output "sender_email_arn" {
  description = "ARN of the SES email identity"
  value       = aws_ses_email_identity.sender.arn
}

output "configuration_set_name" {
  description = "Name of the SES configuration set"
  value       = aws_ses_configuration_set.cognito_emails.name
}

output "ses_smtp_endpoint" {
  description = "SES SMTP endpoint for the region"
  value       = "email-smtp.${data.aws_region.current.name}.amazonaws.com"
}

data "aws_region" "current" {}
