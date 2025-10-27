output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_arn" {
  description = "ARN of the API Gateway"
  value       = aws_api_gateway_rest_api.main.arn
}

output "api_gateway_execution_arn" {
  description = "Execution ARN of the API Gateway"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

output "api_gateway_endpoint" {
  description = "Invoke URL of the API Gateway"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "api_gateway_stage_name" {
  description = "Name of the deployed stage"
  value       = aws_api_gateway_stage.main.stage_name
}

output "custom_domain_name" {
  description = "Custom domain name for the API (empty if not configured)"
  value       = var.certificate_arn != null ? aws_api_gateway_domain_name.main[0].domain_name : ""
}

output "custom_domain_regional_domain_name" {
  description = "Regional domain name for Route53 alias (empty if not configured)"
  value       = var.certificate_arn != null ? aws_api_gateway_domain_name.main[0].regional_domain_name : ""
}

output "custom_domain_regional_zone_id" {
  description = "Regional zone ID for Route53 alias (empty if not configured)"
  value       = var.certificate_arn != null ? aws_api_gateway_domain_name.main[0].regional_zone_id : ""
}

output "full_api_endpoint" {
  description = "Full API endpoint URL (custom domain if configured, otherwise default)"
  value       = var.certificate_arn != null ? "https://${aws_api_gateway_domain_name.main[0].domain_name}/api" : aws_api_gateway_stage.main.invoke_url
}
