output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.shared_data.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.shared_data.arn
}

output "bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.shared_data.bucket_domain_name
}