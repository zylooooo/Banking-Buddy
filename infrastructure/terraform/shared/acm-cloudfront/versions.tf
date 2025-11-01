terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 6.17.0"
      configuration_aliases = [
        aws.us_east_1
      ]
    }
  }
}

