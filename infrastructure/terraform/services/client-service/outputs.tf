output "alb_dns_name" {
  description = "ALB DNS name for the client service"
  value       = aws_elastic_beanstalk_environment.client_service.endpoint_url
}

output "environment_name" {
  description = "Elastic Beanstalk environment name"
  value       = aws_elastic_beanstalk_environment.client_service.name
}

output "application_name" {
  description = "Elastic Beanstalk application name"
  value       = aws_elastic_beanstalk_application.client_service.name
}

output "endpoint_url" {
  description = "HTTP endpoint URL for the client service"
  value       = "http://${aws_elastic_beanstalk_environment.client_service.endpoint_url}"
}
