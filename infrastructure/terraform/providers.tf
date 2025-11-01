terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.17.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Retry configuration for handling transient API errors
  retry_mode  = "adaptive"
  max_retries = 5

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.team_name
    }
  }
}

# Provider for us-east-1 region (required for CloudFront ACM certificates)
# CloudFront requires ACM certificates to be in us-east-1 regardless of where your app is deployed
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  # Retry configuration for handling transient API errors
  retry_mode  = "adaptive"
  max_retries = 5

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.team_name
    }
  }
}

# Data source for current AWS region
data "aws_region" "current" {}
