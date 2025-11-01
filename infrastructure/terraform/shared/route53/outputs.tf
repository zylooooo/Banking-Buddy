output "zone_id" {
  description = "Route53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "zone_name" {
  description = "Route53 hosted zone name"
  value       = data.aws_route53_zone.main.name
}

output "api_record_name" {
  description = "Full domain name for API"
  value       = var.api_subdomain != "" ? aws_route53_record.api[0].fqdn : null
}

output "frontend_record_name" {
  description = "Full domain name for frontend"
  value       = var.frontend_subdomain != "" ? aws_route53_record.frontend[0].fqdn : null
}