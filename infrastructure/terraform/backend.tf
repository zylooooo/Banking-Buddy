terraform {
  backend "s3" {
    bucket       = "banking-buddy-dev-terraform-state"
    key          = "infrastructure/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}
