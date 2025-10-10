variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "nat_gateway_public_ip" {
  description = "Public IP of the NAT Gateway"
  type        = string
}

variable "developer_ips" {
  description = "List of public IPs for developer access"
  type        = list(string)
}