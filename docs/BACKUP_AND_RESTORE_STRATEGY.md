# Backup and Restore Strategy

## Executive Summary

This document outlines the backup and restore strategy for the Banking Buddy application infrastructure. The strategy is designed to protect critical business data while maintaining cost-effectiveness and operational simplicity.

## 1. Backup Strategy Overview

### 1.1 Approach: AWS Backup Service

We have chosen **AWS Backup** as our centralized backup solution for the following reasons:

- **Centralized Management**: Single console to manage all backups across multiple AWS services
- **Automated Scheduling**: Automated daily and weekly backup schedules with configurable retention policies
- **Cost-Effective**: Pay only for storage used, with automatic lifecycle management (cold storage transition)
- **Production-Ready**: Enterprise-grade backup solution suitable for banking applications
- **Compliance**: Meets regulatory requirements for data protection and audit trails
- **Architecture Alignment**: Matches the architecture diagram which includes AWS Backup service

### 1.2 Backup Schedule

- **12-Hour Backups**: Executed at 2:00 AM UTC and 2:00 PM UTC (10:00 AM and 10:00 PM SGT) every day (meets 12-hour RPO requirement)
- **Daily Backups**: Executed at 2:00 AM UTC (10:00 AM SGT) every day
- **Weekly Backups**: Executed on Sundays at 3:00 AM UTC (11:00 AM SGT)
- **Continuous Backups**: Enabled for DynamoDB (point-in-time recovery)

### 1.3 Retention Policy

- **12-Hour Backups**: Retained for 3 days (sufficient for 12-hour RPO requirement)
- **Daily Backups**: Retained for 7 days
- **Weekly Backups**: Retained for 30 days
- **Cold Storage**: Not used (AWS Backup requires delete_after to be at least 90 days after cold_storage_after, which is not suitable for short retention periods)

## 2. Resources Included in Backup

### 2.1 RDS MySQL Database

**Resource**: RDS MySQL instance (`crm_transactions` database)

**Why Backup?**

- Contains all transactional data (accounts, transactions, balances)
- Critical business data that cannot be regenerated
- Required for business continuity and disaster recovery

**Backup Details**:

- **Type**: Automated snapshots via AWS Backup
- **Retention**: 3 days (12-hour), 7 days (daily), 30 days (weekly)
- **Point-in-Time Recovery**: Enabled through RDS automated backups
- **Multi-AZ**: Enabled for high availability (standby replica in another AZ)

**What's Protected**:

- All database tables and schemas
- Transaction history
- User account data
- Client information
- All application data stored in MySQL

### 2.2 DynamoDB Audit Logs Table

**Resource**: DynamoDB table (`audit-logs`)

**Why Backup?**

- Contains audit trail of all system operations
- Required for regulatory compliance (banking/financial regulations)
- Critical for security investigations and compliance audits
- Cannot be regenerated if lost

**Backup Details**:

- **Type**: Continuous backups with point-in-time recovery (PITR)
- **Retention**: 3 days (12-hour), 7 days (daily), 30 days (weekly)
- **Continuous Backup**: Enabled for granular recovery (down to seconds)

**What's Protected**:

- All audit log entries
- Agent activity logs
- CRUD operation history
- Timestamped audit trail data

## 3. Resources Excluded from Backup

### 3.1 EC2 Instances

**Excluded Resources**:

- SFTP Server EC2 instance
- Elastic Beanstalk managed EC2 instances (User Service, Client Service, Transaction Service, AI Service)

**Why Excluded?**

1. **Stateless Architecture**:
   - Application code is stored in GitHub and deployed via CI/CD
   - No persistent data stored on EC2 instances
   - All data is stored in RDS, DynamoDB, or S3

2. **Infrastructure-as-Code**:
   - All infrastructure is defined in Terraform
   - EC2 instances can be easily reprovisioned
   - Configuration is automated via user data scripts

3. **Auto-Recovery**:
   - Elastic Beanstalk automatically replaces failed instances
   - Auto Scaling Groups maintain desired capacity
   - No manual intervention required

4. **Cost Optimization**:
   - Backing up 8-16+ EC2 instances would be costly
   - No business value in backing up stateless compute resources
   - Resources can be recreated in minutes

5. **SFTP Server Specific**:
   - Mock mainframe with no real data
   - Used as bastion host (stateless)
   - Can be reprovisioned via Terraform if needed

### 3.2 ElastiCache (Redis)

**Excluded from AWS Backup** (but has native snapshots available)

**Why Excluded?**

- Cache data is ephemeral and can be regenerated
- Data is sourced from RDS/DynamoDB (which are backed up)
- Cache failures don't result in data loss
- Native ElastiCache snapshots available if needed in future

**Note**: ElastiCache has Multi-AZ enabled for high availability, providing protection against single-AZ failures.

### 3.3 S3 Buckets

**Excluded from AWS Backup** (but has versioning enabled)

**Why Excluded?**

- S3 buckets already have versioning enabled
- Lifecycle policies manage old versions
- S3 provides 99.999999999% (11 9's) durability
- Versioning provides sufficient protection for object-level recovery

### 3.4 Lambda Functions

#### Excluded from AWS Backup

**Why Excluded?**

- Code is stored in GitHub (source control)
- Deployed via CI/CD pipeline
- No persistent state
- Can be redeployed from source control

## 4. Backup Configuration Details

### 4.1 AWS Backup Vault

- **Name**: `{name_prefix}-backup-vault`
- **Encryption**: AWS managed keys (default)
- **Access Control**: IAM-based access control

### 4.2 Backup Plan

- **Plan Name**: `{name_prefix}-backup-plan`
- **Rules**:
  - **12-Hour Rule**: `12-hour-backup-rule`
    - Schedule: `cron(0 2,14 * * ? *)` (Every 12 hours at 2 AM and 2 PM UTC)
    - Retention: 3 days
    - Purpose: Meets 12-hour RPO requirement
  - **Daily Rule**: `daily-backup-rule`
    - Schedule: `cron(0 2 * * ? *)` (Daily at 2 AM UTC)
    - Retention: 7 days
    - Cold Storage: Not used (short retention period)
  - **Weekly Rule**: `weekly-backup-rule`
    - Schedule: `cron(0 3 ? * SUN *)` (Sundays at 3 AM UTC)
    - Retention: 30 days
    - Cold Storage: Not used (short retention period)

### 4.3 Backup Selection

- **Selection Name**: `{name_prefix}-backup-selection`
- **Selection Method**: Explicit resource ARN list
- **Resources**:
  - RDS MySQL instance ARN
  - DynamoDB audit logs table ARN

### 4.4 IAM Permissions

AWS Backup uses a dedicated IAM role with permissions for:

- RDS: Describe instances, list snapshots, create backups
- DynamoDB: Describe tables, list backups, create backups
- Backup Service: Start backup jobs, restore jobs, manage vaults

## 5. Restore Strategy

### 5.1 RDS Database Restore

#### Scenario 1: Point-in-Time Recovery (Within 7 Days)

**Use Case**: Accidental data deletion, corruption, or need to restore to specific time

**Steps**:

1. Navigate to AWS Backup console
2. Select the backup vault
3. Find the RDS backup closest to desired restore point
4. Click "Restore"
5. Choose restore point (can select specific time within retention window)
6. Configure new RDS instance settings:
   - Instance identifier (must be unique)
   - Instance class
   - Subnet group
   - Security groups
7. Start restore job
8. Wait for restore to complete (time depends on database size)
9. Update application configuration to point to new instance
10. Verify data integrity
11. Switch traffic to restored instance

**Recovery Time Objective (RTO)**: 1-4 hours (depending on database size)
**Recovery Point Objective (RPO)**: Up to 5 minutes (point-in-time recovery granularity)

#### Scenario 2: Full Database Restore from Snapshot

**Use Case**: Complete database failure, need to restore entire database

**Steps**:

1. Navigate to AWS Backup console
2. Select backup vault
3. Find desired backup snapshot
4. Click "Restore"
5. Configure new RDS instance
6. Start restore job
7. Wait for completion
8. Update application endpoints
9. Verify and switch traffic

**RTO**: 1-4 hours
**RPO**: Up to 12 hours (last 12-hour backup)

#### Scenario 3: Cross-Region Disaster Recovery

**Use Case**: Region-wide outage requiring failover to alternate region

**Optimized Recovery Procedures** (Target: <12 hours RTO, <12 hours RPO):

1. **Assessment and Decision** (15 minutes)
   - Assess scope of disaster
   - Determine if regional failover is needed
   - Notify stakeholders
   - Activate DR team

2. **Parallel Infrastructure Deployment** (2-3 hours)
   - **Parallel Execution**: Deploy infrastructure components simultaneously
   - Update Terraform variables for new region (5 minutes)
   - Run `terraform apply` in alternate region (1.5-2.5 hours)
     - VPC, Security Groups, IAM (parallel)
     - RDS subnet groups, ElastiCache subnet groups (parallel)
     - Application services (parallel deployment)
   - Verify infrastructure deployment (15 minutes)
   - **Optimization**: Use Terraform workspaces or modules for faster deployment

3. **Parallel Data Restoration** (4-6 hours)
   - **RDS Restore** (3-5 hours, depending on database size):
     - Initiate RDS restore from cross-region backup (5 minutes)
     - Restore runs in parallel with other operations
     - For databases <50GB: ~2-3 hours
     - For databases 50-200GB: ~3-4 hours
     - For databases >200GB: ~4-5 hours
   - **DynamoDB Restore** (30 minutes - 1 hour, parallel):
     - Restore DynamoDB table from backup (10 minutes)
     - Wait for table to become active (20-50 minutes)
   - **S3 Data Sync** (1-2 hours, parallel):
     - Sync critical S3 buckets if needed
   - Verify data integrity (30 minutes)

4. **Automated Application Configuration** (30 minutes)
   - Update DNS/Route53 records (automated via Terraform, 5 minutes)
   - Update application environment variables (automated, 5 minutes)
   - Verify connectivity (10 minutes)
   - Health check all services (10 minutes)

5. **Testing and Validation** (1 hour)
   - Run automated smoke tests (15 minutes)
   - Verify critical functionality (30 minutes)
   - Monitor for issues (15 minutes)

6. **Automated Cutover** (15 minutes)
   - Switch DNS to new region (automated, 5 minutes)
   - Monitor application health (10 minutes)
   - Document incident

**Total RTO**: 8-11 hours (meets 12-hour requirement)
**Total RPO**: Up to 12 hours (with 12-hour backup frequency)

**Optimization Strategies**:

- **Parallel Execution**: Deploy infrastructure components simultaneously
- **Automated DNS Failover**: Use Route53 health checks for automatic failover
- **Pre-warmed Standby**: Consider maintaining a warm standby in DR region (optional, increases cost)
- **Cross-Region Backups**: Enable cross-region backup copying for faster restore
- **Database Read Replicas**: Use cross-region read replicas for near-zero RPO (optional, increases cost)

### 5.2 DynamoDB Table Restore

#### Scenario 1: Point-in-Time Recovery

**Use Case**: Accidental deletion, corruption, need to restore to specific second

**Steps**:

1. Navigate to AWS Backup console
2. Select backup vault
3. Find DynamoDB backup
4. Click "Restore"
5. Select restore point (can specify exact timestamp)
6. Choose restore target:
   - Restore to new table (recommended)
   - Or restore to existing table (overwrites)
7. Configure new table settings
8. Start restore job
9. Wait for completion
10. Update application to use new table
11. Verify data integrity

**RTO**: 30 minutes - 2 hours
**RPO**: Up to 35 days (PITR window), granularity: seconds

#### Scenario 2: Full Table Restore

**Use Case**: Complete table loss

**Steps**:

1. Navigate to AWS Backup console
2. Select desired backup snapshot
3. Restore to new table
4. Update application configuration
5. Verify and switch traffic

**RTO**: 30 minutes - 2 hours
**RPO**: Up to 12 hours (last 12-hour backup)

### 5.3 Testing Restore Procedures

**Frequency**: Quarterly (every 3 months)

**Test Scenarios**:

1. Restore RDS to point-in-time (test environment)
2. Restore DynamoDB table (test environment)
3. Verify data integrity
4. Document any issues or improvements needed
5. Update runbooks based on findings

## 6. Disaster Recovery Plan

### 6.1 Disaster Recovery Strategy

**Approach**: Infrastructure-as-Code (Terraform) + AWS Backup

**Rationale**:

- All infrastructure is defined in Terraform
- Can redeploy entire infrastructure in alternate region
- Restore data from AWS Backup
- Faster recovery than traditional DR approaches

### 6.2 Recovery Procedures

#### Regional Disaster Recovery

**Note**: This section has been updated with optimized procedures. See Section 5.1 Scenario 3 for detailed cross-region disaster recovery procedures with 12-hour RTO/RPO targets.

### 6.3 Backup Verification

**Automated Monitoring**:

- CloudWatch alarms for backup job failures
- SNS notifications for backup status
- Daily backup job status checks

**Manual Verification**:

- Weekly review of backup job status
- Monthly verification of backup integrity
- Quarterly restore testing

## 7. Cost Considerations

### 7.1 Backup Storage Costs

**Estimated Monthly Costs** (for dev environment):

- RDS Backup Storage: ~$0.10-0.20/GB/month
  - Estimated: 5GB × $0.15 = $0.75/month
- DynamoDB Backup Storage: ~$0.20/GB/month
  - Estimated: 1GB × $0.20 = $0.20/month
- **Total Estimated**: ~$1-2/month

**Note**: Cold storage is not used due to short retention periods. For longer retention (90+ days), cold storage can provide cost savings.

### 7.2 Cost Optimization

- **Retention Policy**: 3 days (12-hour), 7 days (daily), 30 days (weekly) (balanced between protection and cost)
- **Selective Backup**: Only backing up critical data stores (RDS, DynamoDB)
- **Excluded Resources**: EC2 instances excluded (stateless, can be reprovisioned)
- **Short Retention**: Short retention periods keep storage costs low (cold storage not needed)
- **12-Hour Backups**: Additional backup frequency increases storage costs slightly but meets 12-hour RPO requirement

## 8. Compliance and Audit

### 8.1 Compliance Requirements

This backup strategy meets requirements for:

- **Data Protection**: Critical business data is backed up with appropriate retention
- **Audit Trail**: Audit logs are protected with 7-year retention (application-level)
- **Disaster Recovery**: Documented DR procedures and recovery objectives
- **Testing**: Quarterly restore testing ensures backup validity

### 8.2 Audit Trail

- All backup operations are logged in CloudTrail
- Backup job history maintained in AWS Backup console
- Restore operations logged and auditable
- Compliance reports available via AWS Backup console

## 9. Monitoring and Alerting

### 9.1 Backup Monitoring

**Metrics to Monitor**:

- Backup job success/failure rate
- Backup job duration
- Storage usage in backup vault
- Restore job status

**Alerts**:

- Backup job failures (immediate notification)
- Backup job delays (notification if > 1 hour late)
- Storage threshold warnings (if > 80% of expected)

### 9.2 CloudWatch Integration

- Backup job metrics available in CloudWatch
- Custom dashboards for backup status
- Automated alarms for failures

## 10. Maintenance and Updates

### 10.1 Regular Maintenance

- **Weekly**: Review backup job status
- **Monthly**: Verify backup storage usage and costs
- **Quarterly**: Perform restore testing
- **Annually**: Review and update backup strategy

### 10.2 Strategy Updates

The backup strategy should be reviewed and updated when:

- Application architecture changes
- New critical data stores are added
- Compliance requirements change
- Cost optimization opportunities identified
- Recovery time objectives change

## 11. Documentation and Runbooks

### 11.1 Available Documentation

- This backup and restore strategy document
- Terraform infrastructure code (infrastructure-as-code)
- AWS Backup console (backup job history, restore options)

### 11.2 Runbooks

**Restore Runbooks** (to be created):

- RDS Point-in-Time Restore Runbook
- DynamoDB Restore Runbook
- Full Disaster Recovery Runbook

## 12. Summary

### 12.1 Key Points

- **Centralized Backup**: AWS Backup provides unified backup management
- **Automated**: Daily and weekly backups run automatically
- **Cost-Effective**: Only backing up critical data stores
- **Production-Ready**: Suitable for banking application requirements
- **Compliant**: Meets data protection and audit requirements

### 12.2 Backup Coverage

| Resource | Backup Method | Retention | RPO | RTO |
|----------|--------------|-----------|-----|-----|
| RDS MySQL | AWS Backup + Native PITR | 3 days (12-hour), 7 days (daily), 30 days (weekly) | 12 hours (12-hour backups), 5 minutes (PITR) | 1-4 hours (single-region), 8-11 hours (cross-region) |
| DynamoDB Audit Logs | AWS Backup + Continuous PITR | 3 days (12-hour), 7 days (daily), 30 days (weekly) | 12 hours (12-hour backups), Seconds (PITR) | 30 min - 2 hours |
| EC2 Instances | Excluded (stateless, IaC) | N/A | N/A | 15-30 minutes (reprovision) |
| ElastiCache | Excluded (ephemeral cache) | N/A | N/A | Immediate (regenerate) |
| S3 Buckets | Versioning (native) | 30 days | Immediate | Immediate |

### 12.3 Recovery Objectives

- **RTO (Recovery Time Objective)**:
  - Single-region restore: 1-4 hours for data stores
  - Cross-region disaster recovery: 8-11 hours (meets 12-hour requirement)
- **RPO (Recovery Point Objective)**:
  - 12 hours (using 12-hour backup schedule) - meets requirement
  - 5 minutes for RDS (using point-in-time recovery)
  - Seconds for DynamoDB (using continuous PITR)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-16  
**Owner**: CS301G2T1 Team  
