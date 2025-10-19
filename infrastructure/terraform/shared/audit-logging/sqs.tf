# SQS Dead Letter Queue for failed audit logs
resource "aws_sqs_queue" "audit_logs_dlq" {
  name                      = "${var.name_prefix}-audit-logs-dlq"
  message_retention_seconds = 1209600 # 14 days for manual review

  tags = merge(var.common_tags, {
    Name        = "${var.name_prefix}-audit-logs-dlq"
    Purpose     = "Dead letter queue for failed audit log messages"
    Environment = var.name_prefix
  })
}

# Main SQS Queue for audit logs
resource "aws_sqs_queue" "audit_logs" {
  name                       = "${var.name_prefix}-audit-logs"
  visibility_timeout_seconds = 30     # Lambda processing time window
  message_retention_seconds  = 345600 # 4 days
  receive_wait_time_seconds  = 20     # Long polling for cost optimization

  # Redrive policy - send to DLQ after 3 failed attempts
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.audit_logs_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.common_tags, {
    Name        = "${var.name_prefix}-audit-logs"
    Purpose     = "Main queue for async audit log processing"
    Environment = var.name_prefix
  })
}

# CloudWatch Alarm for DLQ depth
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.name_prefix}-audit-dlq-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300 # 5 minutes
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Alert when messages appear in audit logs DLQ"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.audit_logs_dlq.name
  }

  tags = var.common_tags
}

# IAM policy for services to publish to SQS
resource "aws_iam_policy" "sqs_publish_policy" {
  name        = "${var.name_prefix}-audit-sqs-publish-policy"
  description = "Policy for services to publish audit logs to SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.audit_logs.arn
      }
    ]
  })

  tags = var.common_tags
}
