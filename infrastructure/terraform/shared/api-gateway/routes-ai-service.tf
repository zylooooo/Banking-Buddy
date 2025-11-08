# /api/ai resource
resource "aws_api_gateway_resource" "ai" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "ai"
}

# /api/ai/guide resource
resource "aws_api_gateway_resource" "ai_guide" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.ai.id
  path_part   = "guide"
}

# /api/ai/guide/{proxy+} for all sub-paths
resource "aws_api_gateway_resource" "ai_guide_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.ai_guide.id
  path_part   = "{proxy+}"
}

# /api/ai/query resource
resource "aws_api_gateway_resource" "ai_query" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.ai.id
  path_part   = "query"
}

# CORS preflight for /api/ai/guide
resource "aws_api_gateway_method" "ai_guide_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_guide.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "ai_guide_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide.id
  http_method = aws_api_gateway_method.ai_guide_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "ai_guide_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide.id
  http_method = aws_api_gateway_method.ai_guide_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "ai_guide_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide.id
  http_method = aws_api_gateway_method.ai_guide_options.http_method
  status_code = aws_api_gateway_method_response.ai_guide_options.status_code

  response_templates = {
    "application/json" = ""
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS preflight for /api/ai/guide/{proxy+}
resource "aws_api_gateway_method" "ai_guide_proxy_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_guide_proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "ai_guide_proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "ai_guide_proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "ai_guide_proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_options.http_method
  status_code = aws_api_gateway_method_response.ai_guide_proxy_options.status_code

  response_templates = {
    "application/json" = ""
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ANY method for /api/ai/guide/{proxy+} (with Cognito auth)
resource "aws_api_gateway_method" "ai_guide_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_guide_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.proxy"           = true
    "method.request.header.Authorization" = true
  }
}

resource "aws_api_gateway_integration" "ai_guide_proxy_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.ai_guide_proxy.id
  http_method             = aws_api_gateway_method.ai_guide_proxy_any.http_method
  type                    = "HTTP_PROXY"
  uri                     = "${var.ai_service_endpoint}/api/ai/guide/{proxy}"
  integration_http_method = "ANY"

  request_parameters = {
    "integration.request.path.proxy"             = "method.request.path.proxy"
    "integration.request.header.X-Forwarded-For" = "context.identity.sourceIp"
    "integration.request.header.Authorization"   = "method.request.header.Authorization"
  }

  timeout_milliseconds = 29000
}

# CORS preflight for /api/ai/query
resource "aws_api_gateway_method" "ai_query_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_query.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "ai_query_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "ai_query_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "ai_query_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_options.http_method
  status_code = aws_api_gateway_method_response.ai_query_options.status_code

  response_templates = {
    "application/json" = ""
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# POST method for /api/ai/query (with Cognito auth)
resource "aws_api_gateway_method" "ai_query_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_query.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.header.Authorization" = true
  }
}

resource "aws_api_gateway_integration" "ai_query_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.ai_query.id
  http_method             = aws_api_gateway_method.ai_query_post.http_method
  type                    = "HTTP_PROXY"
  uri                     = "${var.ai_service_endpoint}/api/ai/query"
  integration_http_method = "POST"

  request_parameters = {
    "integration.request.header.X-Forwarded-For" = "context.identity.sourceIp"
    "integration.request.header.Authorization"   = "method.request.header.Authorization"
  }

  timeout_milliseconds = 29000
}

# Method responses for /api/ai/guide/{proxy+}
resource "aws_api_gateway_method_response" "ai_guide_proxy_any" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_any.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "ai_guide_proxy_any" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_any.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.ai_guide_proxy_any,
    aws_api_gateway_method_response.ai_guide_proxy_any
  ]
}

resource "aws_api_gateway_method_response" "ai_guide_proxy_any_4xx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_any.http_method
  status_code = "400"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "ai_guide_proxy_any_4xx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_any.http_method
  status_code = aws_api_gateway_method_response.ai_guide_proxy_any_4xx.status_code

  selection_pattern = "4\\d{2}"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.ai_guide_proxy_any,
    aws_api_gateway_method_response.ai_guide_proxy_any_4xx
  ]
}

resource "aws_api_gateway_method_response" "ai_guide_proxy_any_5xx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_any.http_method
  status_code = "500"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "ai_guide_proxy_any_5xx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_guide_proxy.id
  http_method = aws_api_gateway_method.ai_guide_proxy_any.http_method
  status_code = aws_api_gateway_method_response.ai_guide_proxy_any_5xx.status_code

  selection_pattern = "5\\d{2}"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.ai_guide_proxy_any,
    aws_api_gateway_method_response.ai_guide_proxy_any_5xx
  ]
}

# Method responses for /api/ai/query
resource "aws_api_gateway_method_response" "ai_query_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "ai_query_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.ai_query_post,
    aws_api_gateway_method_response.ai_query_post
  ]
}

resource "aws_api_gateway_method_response" "ai_query_post_4xx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_post.http_method
  status_code = "400"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "ai_query_post_4xx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_post.http_method
  status_code = aws_api_gateway_method_response.ai_query_post_4xx.status_code

  selection_pattern = "4\\d{2}"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.ai_query_post,
    aws_api_gateway_method_response.ai_query_post_4xx
  ]
}

resource "aws_api_gateway_method_response" "ai_query_post_5xx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_post.http_method
  status_code = "500"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "ai_query_post_5xx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_query.id
  http_method = aws_api_gateway_method.ai_query_post.http_method
  status_code = aws_api_gateway_method_response.ai_query_post_5xx.status_code

  selection_pattern = "5\\d{2}"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.ai_query_post,
    aws_api_gateway_method_response.ai_query_post_5xx
  ]
}