# REST API Gateway for all microservices
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.name_prefix}-api"
  description = "Banking Buddy API Gateway - Centralized entry point for all microservices"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.common_tags
}

# Custom domain name for API Gateway
resource "aws_api_gateway_domain_name" "main" {
  count = var.certificate_arn != null ? 1 : 0
  
  domain_name              = var.api_domain_name
  regional_certificate_arn = var.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.common_tags
}

# Base path mapping
resource "aws_api_gateway_base_path_mapping" "main" {
  count = var.certificate_arn != null ? 1 : 0

  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  domain_name = aws_api_gateway_domain_name.main[0].domain_name
}

# Deployment resource
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api.id,
      aws_api_gateway_resource.users.id,
      aws_api_gateway_resource.users_proxy.id,
      aws_api_gateway_method.users_options.id,
      aws_api_gateway_method.users_any.id,
      aws_api_gateway_method.users_proxy_options.id,
      aws_api_gateway_method.users_proxy_any.id,
      aws_api_gateway_integration.users_any.id,
      aws_api_gateway_integration.users_proxy_any.id,
      aws_api_gateway_method_response.users_any.id,
      aws_api_gateway_method_response.users_proxy_any.id,
      aws_api_gateway_integration_response.users_any.id,
      aws_api_gateway_integration_response.users_proxy_any.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_method.users_any,
    aws_api_gateway_method.users_proxy_any,
    aws_api_gateway_integration.users_any,
    aws_api_gateway_integration.users_proxy_any,
    aws_api_gateway_method_response.users_any,
    aws_api_gateway_method_response.users_proxy_any,
    aws_api_gateway_integration_response.users_any,
    aws_api_gateway_integration_response.users_proxy_any,
  ]
}

# Stage with throttling and logging
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  # CloudWatch logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      caller           = "$context.identity.caller"
      user             = "$context.identity.user"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      resourcePath     = "$context.resourcePath"
      status           = "$context.status"
      protocol         = "$context.protocol"
      responseLength   = "$context.responseLength"
      errorMessage     = "$context.error.message"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  # X-Ray tracing for debugging
  xray_tracing_enabled = true

  tags = var.common_tags
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.name_prefix}-api"
  retention_in_days = 7

  tags = var.common_tags
}

# API Gateway account settings for CloudWatch
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# IAM role for API Gateway CloudWatch logging
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.name_prefix}-apigw-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "apigateway.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Stage-level throttling settings
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled    = true
    logging_level      = "INFO"
    data_trace_enabled = false # Set to true for debugging

    # Throttling: Banking systems typically use conservative limits
    throttling_burst_limit = 500 # Maximum concurrent requests
    throttling_rate_limit  = 250 # Requests per second
  }
}

# Associate WAF with API Gateway
resource "aws_wafv2_web_acl_association" "api" {
  resource_arn = aws_api_gateway_stage.main.arn
  web_acl_arn  = var.waf_web_acl_arn
}
