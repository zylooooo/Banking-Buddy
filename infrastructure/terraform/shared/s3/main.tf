# S3 Bucket for shared data storage
resource "aws_s3_bucket" "shared_data" {
  bucket = "${var.name_prefix}-shared-data-${random_string.bucket_suffix.result}"

  # Allow Terraform to delete bucket even if it contains objects
  # This prevents "BucketNotEmpty" errors during terraform destroy
  force_destroy = true

  tags = var.common_tags
}

# Random string for unique bucket name
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "shared_data" {
  bucket = aws_s3_bucket.shared_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "shared_data" {
  bucket = aws_s3_bucket.shared_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "shared_data" {
  bucket = aws_s3_bucket.shared_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "shared_data" {
  bucket = aws_s3_bucket.shared_data.id

  rule {
    id     = "delete_old_versions"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "transition_to_ia"
    status = "Enabled"

    filter {
      prefix = ""
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}