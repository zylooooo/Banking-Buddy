output "sftp_server_id" {
  description = "ID of the SFTP server security group"
  value       = aws_security_group.sftp_server.id
}

output "lambda_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda.id
}

output "rds_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "alb_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "elastic_beanstalk_id" {
  description = "ID of the Elastic Beanstalk security group"
  value       = aws_security_group.elastic_beanstalk.id
}
