# SFTP Server Security Group
resource "aws_security_group" "sftp_server" {
  name_prefix = "${var.name_prefix}-sftp-server-"
  vpc_id      = var.vpc_id
  description = "Security group for SFTP server"

  # SSH access for management
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = concat(
      ["${var.nat_gateway_public_ip}/32"], # Lambda access via NAT gateway
      var.developer_ips # SSH from local machine(s)
    )
    description = "SSH/SFTP access from Lambda via NAT gateway and SSH from local machine "
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-sftp-server-sg"
    Type = "SFTP Server"
  })
}

# Lambda Security Group
resource "aws_security_group" "lambda" {
  name_prefix = "${var.name_prefix}-lambda-"
  vpc_id      = var.vpc_id
  description = "Security group for Lambda function"

  # Outbound to SFTP server
  egress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description     = "SFTP access to external mainframe (public IP via NAT gateway)"
  }

  # Outbound to RDS (using CIDR instead of security group)
  egress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]  
    description = "MySQL access to RDS"
  }

  # Outbound to internet (for package downloads)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS access to internet"
  }

  # Outbound to internet (for package downloads)
  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP access to internet"
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-lambda-sg"
    Type = "Lambda Function"
  })
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${var.name_prefix}-rds-"
  vpc_id      = var.vpc_id
  description = "Security group for RDS MySQL database"

  # MySQL access from Lambda (using CIDR instead of security group)
  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]  
    description = "MySQL access from Lambda"
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-rds-sg"
    Type = "RDS Database"
  })
}
