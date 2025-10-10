variable "vpc_cidr" {
    description = "CIDR block for VPC"
    type = string
}

variable "availability_zones" {
    description = "List of availability zones"
    type = list(string)
}

variable "common_tags" {
    description = "Common tags to apply to all resources"
    type = map(string)
}

variable "vpc_name" {
    description = "Name of the VPC"
    type = string
}

variable "name_prefix" {
    description = "Name prefix for resources"
    type = string
}