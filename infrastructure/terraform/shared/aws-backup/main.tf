# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name        = "${var.name_prefix}-backup-vault"
  kms_key_arn = null # Use default AWS managed key for cost savings

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-backup-vault"
  })
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup_role" {
  name = "${var.name_prefix}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# IAM Policy for AWS Backup
resource "aws_iam_role_policy" "backup_policy" {
  name = "${var.name_prefix}-backup-policy"
  role = aws_iam_role.backup_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBSnapshots",
          "rds:ListTagsForResource",
          "dynamodb:DescribeTable",
          "dynamodb:ListBackups"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "backup:PutBackupVaultNotifications",
          "backup:StartBackupJob",
          "backup:GetBackupVaultNotifications",
          "backup:StartRestoreJob",
          "backup:DescribeBackupJob",
          "backup:DescribeRestoreJob",
          "backup:CreateBackupSelection",
          "backup:GetBackupVaultAccessPolicy",
          "backup:PutBackupVaultAccessPolicy"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:CreateDBSnapshot",
          "rds:CopyDBSnapshot",
          "dynamodb:CreateBackup",
          "dynamodb:RestoreTableFromBackup"
        ]
        Resource = "*"
      }
    ]
  })
}

# Backup Plan - 12-hour, daily, and weekly backups with retention
resource "aws_backup_plan" "main" {
  name = "${var.name_prefix}-backup-plan"

  # 12-hour backup rule (for 12-hour RPO requirement)
  rule {
    rule_name         = "12-hour-backup-rule"
    target_vault_name = aws_backup_vault.main.name
    schedule         = "cron(0 2,14 * * ? *)" # Every 12 hours at 2 AM and 2 PM UTC (10 AM and 10 PM SGT)

    lifecycle {
      # Retain 12-hour backups for 3 days (sufficient for 12-hour RPO)
      delete_after = var.twelve_hour_backup_retention_days
    }

    # Enable continuous backups for DynamoDB (point-in-time recovery)
    enable_continuous_backup = true
  }

  rule {
    rule_name         = "daily-backup-rule"
    target_vault_name = aws_backup_vault.main.name
    schedule         = "cron(0 2 * * ? *)" # Daily at 2 AM UTC (10 AM SGT)

    lifecycle {
      # For short retention (7 days), don't use cold storage
      # Cold storage requires delete_after to be at least 90 days after cold_storage_after
      delete_after = var.backup_retention_days
    }

    # Enable continuous backups for DynamoDB (point-in-time recovery)
    enable_continuous_backup = true
  }

  # Optional: Weekly backup rule for longer retention
  rule {
    rule_name         = "weekly-backup-rule"
    target_vault_name = aws_backup_vault.main.name
    schedule         = "cron(0 3 ? * SUN *)" # Weekly on Sunday at 3 AM UTC

    lifecycle {
      # For 30-day retention, don't use cold storage
      # To use cold storage, delete_after must be at least 90 days after cold_storage_after
      delete_after = var.weekly_backup_retention_days
    }
  }

  tags = var.common_tags
}

# Backup Selection - Only backup data stores (RDS and DynamoDB)
resource "aws_backup_selection" "main" {
  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "${var.name_prefix}-backup-selection"
  plan_id      = aws_backup_plan.main.id

  # Explicitly list only the resources that need backup
  resources = var.backup_resources
}

