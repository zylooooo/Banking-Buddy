# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.database_subnet_ids

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-db-subnet-group"
  })

  lifecycle {
    create_before_destroy = true
    # Allow subnet_ids to be updated without destroying first
    # This enables safe migration between subnet sets
  }
}

# RDS Parameter Group for custom settings
resource "aws_db_parameter_group" "main" {
  family = "mysql8.0"
  name   = "${var.name_prefix}-mysql-params"

  parameter {
    name  = "max_connections"
    value = "250"
  }

  tags = var.common_tags
}

# Single RDS MySQL Instance
resource "aws_db_instance" "main" {
  identifier = "${var.name_prefix}-rds-mysql"

  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  # Support for multi-az deployment for high availability
  multi_az = true

  # Create a default database for the Lambda to use
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [var.rds_security_group_id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name

  backup_retention_period = 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Apply changes during maintenance window (not immediately) to avoid downtime
  # Subnet changes will be applied during the next maintenance window
  apply_immediately = false

  skip_final_snapshot = true
  deletion_protection = var.environment == "prod" ? true : false

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-rds-mysql"
  })

  lifecycle {
    create_before_destroy = true
    # RDS Multi-AZ will handle subnet migration automatically during maintenance window
    # The instance will use subnets from the subnet group that are available
  }
}