output "web_acl_id" {
  description = "ID of the REGIONAL WAF Web ACL (for API Gateway)"
  value       = aws_wafv2_web_acl.api.id
}

output "web_acl_arn" {
  description = "ARN of the REGIONAL WAF Web ACL (for API Gateway)"
  value       = aws_wafv2_web_acl.api.arn
}

output "cloudfront_web_acl_id" {
  description = "ID of the CloudFront-scoped WAF Web ACL"
  value       = aws_wafv2_web_acl.cloudfront.id
}

output "cloudfront_web_acl_arn" {
  description = "ARN of the CloudFront-scoped WAF Web ACL (required for CloudFront distributions)"
  value       = aws_wafv2_web_acl.cloudfront.arn
}
