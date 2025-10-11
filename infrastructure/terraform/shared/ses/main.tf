# SES email identity for sending cognito emails
resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

resource "aws_ses_configuration_set" "cognito_emails" {
  name = "${var.name_prefix}-cognito-emails"
}