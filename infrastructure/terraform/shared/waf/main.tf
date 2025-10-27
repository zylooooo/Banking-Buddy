# WAF Web ACL for API Gateway
resource "aws_wafv2_web_acl" "api" {
  name  = "${var.name_prefix}-api-waf"
  scope = "REGIONAL" # For API Gateway in a specific region

  default_action {
    allow {}
  }

  # Rule 1: Rate limiting (300 requests per 5 minutes per IP)
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 300
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: SQL Injection Protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-sqli-protection"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Geographic blocking (optional - adjust as needed)
  # Uncomment if you want to restrict access by country
  # rule {
  #   name     = "GeoBlockRule"
  #   priority = 5
  #
  #   action {
  #     block {}
  #   }
  #
  #   statement {
  #     geo_match_statement {
  #       country_codes = ["CN", "RU", "KP"] # Example: Block China, Russia, North Korea
  #     }
  #   }
  #
  #   visibility_config {
  #     cloudwatch_metrics_enabled = true
  #     metric_name                = "${var.name_prefix}-geo-block"
  #     sampled_requests_enabled   = true
  #   }
  # }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name_prefix}-api-waf"
    sampled_requests_enabled   = true
  }

  tags = var.common_tags
}

# CloudWatch Log Group for WAF logs
# resource "aws_cloudwatch_log_group" "waf" {
#   name              = "/aws/waf/${var.name_prefix}-api"
#   retention_in_days = 7

#   tags = var.common_tags
# }

# # WAF logging configuration
# resource "aws_wafv2_web_acl_logging_configuration" "api" {
#   resource_arn            = aws_wafv2_web_acl.api.arn
#   log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
# }
