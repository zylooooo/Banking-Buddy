# API Gateway HTTP API
resource "aws_apigatewayv2_api" "audit_logs_api" {
  name          = "${var.name_prefix}-audit-logs-api"
  protocol_type = "HTTP"
  description   = "API for querying audit logs with role-based access control"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    max_age       = 300
  }

  tags = var.common_tags
}

# Cognito JWT Authorizer
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.audit_logs_api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.name_prefix}-cognito-authorizer"

  jwt_configuration {
    audience = [var.cognito_user_pool_client_id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}

# Lambda Integration for Reader
resource "aws_apigatewayv2_integration" "audit_reader" {
  api_id                 = aws_apigatewayv2_api.audit_logs_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.audit_reader.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route for GET /api/v1/audit/logs
resource "aws_apigatewayv2_route" "get_audit_logs" {
  api_id             = aws_apigatewayv2_api.audit_logs_api.id
  route_key          = "GET /api/v1/audit/logs"
  target             = "integrations/${aws_apigatewayv2_integration.audit_reader.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Default Stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.audit_logs_api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId       = "$context.requestId"
      ip              = "$context.identity.sourceIp"
      requestTime     = "$context.requestTime"
      httpMethod      = "$context.httpMethod"
      routeKey        = "$context.routeKey"
      status          = "$context.status"
      protocol        = "$context.protocol"
      responseLength  = "$context.responseLength"
      errorMessage    = "$context.error.message"
      authorizerError = "$context.authorizer.error"
    })
  }

  tags = var.common_tags
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${aws_apigatewayv2_api.audit_logs_api.name}"
  retention_in_days = 7

  tags = var.common_tags
}

# Lambda Permission for API Gateway to invoke Reader
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.audit_reader.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.audit_logs_api.execution_arn}/*/*"
}
