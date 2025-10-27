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
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.api_subdomain
  type    = "A"

  alias {
    name                   = var.api_gateway_domain_name
    zone_id                = var.api_gateway_zone_id
    evaluate_target_health = true
  }
}