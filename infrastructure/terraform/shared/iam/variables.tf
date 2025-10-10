variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the s3 bucket"
  type        = string
}
