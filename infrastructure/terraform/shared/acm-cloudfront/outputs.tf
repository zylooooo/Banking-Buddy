output "certificate_arn" {
  description = "ARN of the ACM certificate (in us-east-1, required for CloudFront)"
  value       = aws_acm_certificate.cloudfront.arn
}

output "certificate_domain_name" {
  description = "Domain name of the certificate"
  value       = aws_acm_certificate.cloudfront.domain_name
}

