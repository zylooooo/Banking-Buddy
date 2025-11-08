output "alb_dns_name" {
  description = "DNS name of the EB-managed ALB"
  value       = aws_elastic_beanstalk_environment.ai_service.cname
}

output "environment_name" {
  description = "Name of the EB environment"
  value       = aws_elastic_beanstalk_environment.ai_service.name
}

output "application_name" {
  description = "Name of the EB application"
  value       = aws_elastic_beanstalk_application.ai_service.name
}

output "endpoint_url" {
  description = "Full endpoint URL"
  value       = "http://${aws_elastic_beanstalk_environment.ai_service.cname}"
}