# Elastic Beanstalk Application
resource "aws_elastic_beanstalk_application" "ai_service" {
  name        = "${var.name_prefix}-ai-service"
  description = "Banking Buddy AI Service"

  tags = var.common_tags
}

# Elastic Beanstalk Environment
resource "aws_elastic_beanstalk_environment" "ai_service" {
  name                = "${var.name_prefix}-ai-env"
  application         = aws_elastic_beanstalk_application.ai_service.name
  solution_stack_name = "64bit Amazon Linux 2023 v4.6.6 running Corretto 21"

  # Prevent terraform from triggering deployments after initial creation
  lifecycle {
    create_before_destroy = true
  }

  # VPC Configuration
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = var.vpc_id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", var.private_subnet_ids)
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = join(",", var.public_subnet_ids)
  }

  # Load Balancer Type (EB creates ALB automatically)
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerType"
    value     = "application"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerIsShared"
    value     = "false"
  }

  # Service Role Configuration
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = var.eb_service_role_arn
  }

  # ALB Configuration
  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "SecurityGroups"
    value     = var.alb_security_group_id
  }

  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "ManagedSecurityGroup"
    value     = var.alb_security_group_id
  }

  # Instance Configuration
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = "t3.small"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = var.eb_instance_profile_name
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = var.eb_security_group_id
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "EC2KeyName"
    value     = var.ec2_key_pair_name
  }

  # Auto Scaling Configuration
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = "2"
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = "4"
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "Availability Zones"
    value     = "Any 2"
  }

  # Health Check
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckPath"
    value     = "/actuator/health"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Port"
    value     = "8083"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Protocol"
    value     = "HTTP"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "MatcherHTTPCode"
    value     = "200"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckInterval"
    value     = "30"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckTimeout"
    value     = "10"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthyThresholdCount"
    value     = "2"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "UnhealthyThresholdCount"
    value     = "5"
  }

  # Environment Variables
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SERVER_PORT"
    value     = "8083"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_REGION"
    value     = var.aws_region
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SPRING_PROFILES_ACTIVE"
    value     = "aws"
  }

  # OpenAI Configuration
  # Note: The application expects OPENAI_API_KEY as an env var
  # We'll use a startup script to fetch it from Secrets Manager
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "OPENAI_API_KEY_SECRET_NAME"
    value     = var.openai_api_key_secret_name
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "OPENAI_API_URL"
    value     = "https://api.openai.com/v1"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "OPENAI_MODEL"
    value     = "gpt-4o-mini"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SPRING_APPLICATION_NAME"
    value     = "ai-service"
  }

  # Microservice URLs (using ALB DNS names)
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SERVICES_CLIENT_SERVICE_URL"
    value     = var.client_service_endpoint
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SERVICES_TRANSACTION_SERVICE_URL"
    value     = var.transaction_service_endpoint
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SERVICES_USER_SERVICE_URL"
    value     = var.user_service_endpoint
  }

  # Audit SQS Queue
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AUDIT_SQS_QUEUE_URL"
    value     = var.audit_sqs_queue_url
  }

  # Redis Configuration (if needed)
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SPRING_REDIS_HOST"
    value     = var.redis_endpoint
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SPRING_REDIS_PORT"
    value     = "6379"
  }

  # Rolling Updates
  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "RollingUpdateEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "RollingUpdateType"
    value     = "Health"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "MaxBatchSize"
    value     = "1"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "MinInstancesInService"
    value     = "1"
  }

  # Deployment Policy
  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "Rolling"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSizeType"
    value     = "Fixed"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSize"
    value     = "1"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "IgnoreHealthCheck"
    value     = "false"
  }

  # CloudWatch Logs
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "StreamLogs"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "DeleteOnTerminate"
    value     = "false"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "RetentionInDays"
    value     = "7"
  }

  # Enhanced Health Reporting
  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name      = "SystemType"
    value     = "enhanced"
  }

  # Platform hooks to fetch OpenAI API key from Secrets Manager
  # Note: This requires the script to be included in the deployment package
  # The script should be placed in .platform/hooks/predeploy/01_fetch_openai_key.sh
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_DEFAULT_REGION"
    value     = var.aws_region
  }

  tags = var.common_tags
}