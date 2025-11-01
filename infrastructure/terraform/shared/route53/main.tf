# Note: This assumes you already have a hosted zone in Route53
# If you need to create a new hosted zone, uncomment below:

# resource "aws_route53_zone" "main" {
#   name = var.domain_name
#   tags = var.common_tags
# }

# Data source to reference existing hosted zone
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# A record for API Gateway custom domain
resource "aws_route53_record" "api" {
  count   = var.api_subdomain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.api_subdomain
  type    = "A"

  alias {
    name                   = var.api_gateway_domain_name
    zone_id                = var.api_gateway_zone_id
    evaluate_target_health = true
  }
}

# A record for Frontend CloudFront distribution
resource "aws_route53_record" "frontend" {
  count   = var.frontend_subdomain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.frontend_subdomain
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# AAAA record for Frontend IPv6 support
resource "aws_route53_record" "frontend_ipv6" {
  count   = var.frontend_subdomain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.frontend_subdomain
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}