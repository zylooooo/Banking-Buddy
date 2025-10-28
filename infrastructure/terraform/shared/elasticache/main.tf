# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = var.common_tags
}

# ElastiCache Redis Replication Group (Primary + Replica, Multi-AZ)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "${var.name_prefix}-redis"
  description = "Shared Redis cluster for Banking Buddy services"

  engine             = "redis"
  engine_version     = "7.0"
  node_type          = "cache.t3.small"
  num_cache_clusters = 2 # 1 primary + 1 replica

  # Multi-AZ for HA
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Networking
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_security_group_id]
  port               = 6379

  # Performance
  parameter_group_name = "default.redis7"

  # Maintenance
  maintenance_window = "sun:03:00-sun:05:00"

  # Backups (disabled for dev to save cost)
  snapshot_retention_limit = 0
  snapshot_window          = "02:00-03:00"

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false # Disable for simplicity, enable in prod

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = var.common_tags
}
