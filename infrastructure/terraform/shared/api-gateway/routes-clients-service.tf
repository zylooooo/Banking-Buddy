# /api/clients resource
resource "aws_api_gateway_resource" "clients" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "clients"
}

# /api/clients/{proxy+} for all sub-paths
resource "aws_api_gateway_resource" "clients_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.clients.id
  path_part   = "{proxy+}"
}

# CORS preflight for /api/clients
resource "aws_api_gateway_method" "clients_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.clients.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "clients_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients.id
  http_method = aws_api_gateway_method.clients_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "clients_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients.id
  http_method = aws_api_gateway_method.clients_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "clients_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients.id
  http_method = aws_api_gateway_method.clients_options.http_method
  status_code = aws_api_gateway_method_response.clients_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ANY method for /api/clients (with Cognito auth)
resource "aws_api_gateway_method" "clients_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.clients.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.proxy"           = true
    "method.request.header.Authorization" = true
  }
}

resource "aws_api_gateway_integration" "clients_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.clients.id
  http_method             = aws_api_gateway_method.clients_any.http_method
  type                    = "HTTP_PROXY"
  uri                     = "${var.client_service_endpoint}/api/clients"
  integration_http_method = "ANY"

  request_parameters = {
    "integration.request.header.X-Forwarded-For" = "context.identity.sourceIp"
    "integration.request.header.Authorization"   = "method.request.header.Authorization"
  }

  timeout_milliseconds = 29000
}

resource "aws_api_gateway_method_response" "clients_any" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients.id
  http_method = aws_api_gateway_method.clients_any.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "clients_any" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients.id
  http_method = aws_api_gateway_method.clients_any.http_method
  status_code = aws_api_gateway_method_response.clients_any.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [aws_api_gateway_integration.clients_any]
}

# CORS preflight for /api/clients/{proxy+}
resource "aws_api_gateway_method" "clients_proxy_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.clients_proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "clients_proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients_proxy.id
  http_method = aws_api_gateway_method.clients_proxy_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "clients_proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients_proxy.id
  http_method = aws_api_gateway_method.clients_proxy_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "clients_proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients_proxy.id
  http_method = aws_api_gateway_method.clients_proxy_options.http_method
  status_code = aws_api_gateway_method_response.clients_proxy_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ANY method for /api/clients/{proxy+} (with Cognito auth)
resource "aws_api_gateway_method" "clients_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.clients_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.proxy"           = true
    "method.request.header.Authorization" = true
  }
}

resource "aws_api_gateway_integration" "clients_proxy_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.clients_proxy.id
  http_method             = aws_api_gateway_method.clients_proxy_any.http_method
  type                    = "HTTP_PROXY"
  uri                     = "${var.client_service_endpoint}/api/clients/{proxy}"
  integration_http_method = "ANY"

  request_parameters = {
    "integration.request.path.proxy"             = "method.request.path.proxy"
    "integration.request.header.X-Forwarded-For" = "context.identity.sourceIp"
    "integration.request.header.Authorization"   = "method.request.header.Authorization"
  }

  timeout_milliseconds = 29000
}

resource "aws_api_gateway_method_response" "clients_proxy_any" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients_proxy.id
  http_method = aws_api_gateway_method.clients_proxy_any.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "clients_proxy_any" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.clients_proxy.id
  http_method = aws_api_gateway_method.clients_proxy_any.http_method
  status_code = aws_api_gateway_method_response.clients_proxy_any.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [aws_api_gateway_integration.clients_proxy_any]
}
