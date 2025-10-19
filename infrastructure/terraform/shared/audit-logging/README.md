# Async Audit Logging System

## Overview

This system provides asynchronous audit logging for Banking Buddy microservices using a serverless architecture on AWS. It replaces the previous synchronous DynamoDB writes with an event-driven approach using SQS, Lambda, and API Gateway.

## Architecture

```
┌─────────────────┐       ┌─────────────────────┐
│                 │       │                     │
│  user-service   │       │ transaction-processor│
│  (Java/Spring)  │       │     (Python)        │
│                 │       │                     │
└────────┬────────┘       └──────────┬──────────┘
         │                           │
         │ 1. Publish audit messages │
         └─────────┬─────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │   SQS Queue     │
         │  (audit-logs)   │
         └────────┬────────┘
                  │
                  │ 2. Trigger Lambda
                  ▼
         ┌────────────────────┐
         │   Lambda Writer    │
         │  (Python 3.12)     │
         │  - Batch process   │
         │  - Retry logic     │
         └────────┬───────────┘
                  │
                  │ 3. Write to DynamoDB
                  ▼
         ┌────────────────────┐
         │    DynamoDB        │
         │  audit-logs table  │
         │  - AgentIndex      │
         │  - OperationIndex  │
         └────────┬───────────┘
                  │
                  │ 4. Query logs
                  │
         ┌────────┴───────────┐
         │                    │
         ▼                    ▼
┌────────────────┐    ┌──────────────────┐
│  API Gateway   │    │   Lambda Reader  │
│  + Cognito JWT │───▶│  (Python 3.12)   │
│  Authorization │    │  - Role-based    │
│                │    │  - 24h filtering │
└────────────────┘    └──────────────────┘
         │
         │ 5. Return filtered logs
         ▼
    ┌─────────┐
    │ Agents  │ - See own logs via AgentIndex
    │ Admins  │ - See all logs via Scan/OperationIndex
    └─────────┘
```

## Components

### 1. SQS Queue (`audit-logs`)
- **Purpose**: Buffers audit messages for async processing
- **Visibility Timeout**: 30 seconds (3x Lambda timeout)
- **Message Retention**: 4 days
- **Dead Letter Queue**: Yes, with CloudWatch alarm
- **Max Receives**: 3 (after 3 failures → DLQ)

### 2. Lambda Writer (`audit-writer`)
- **Runtime**: Python 3.12
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Trigger**: SQS batch (up to 10 messages)
- **Retry**: Automatic via SQS + batch failure reporting
- **Permissions**: 
  - SQS: `ReceiveMessage`, `DeleteMessage`, `GetQueueAttributes`
  - DynamoDB: `PutItem`

### 3. Lambda Reader (`audit-reader`)
- **Runtime**: Python 3.12
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Trigger**: API Gateway HTTP requests
- **Query Logic**:
  - **Agents**: Query `AgentIndex` (agent_id + timestamp)
  - **Admins**: Scan or Query `OperationIndex` (crud_operation + timestamp)
- **Time Filtering**: Default 24 hours, configurable via `?hours=X`
- **Permissions**: 
  - DynamoDB: `Query`, `Scan`

### 4. API Gateway (`audit-logs-api`)
- **Type**: HTTP API
- **Authorization**: Cognito JWT (validates custom:role)
- **Routes**: 
  - `GET /api/v1/audit/logs` - Query audit logs
- **CORS**: Enabled for specified origins
- **Query Parameters**:
  - `hours` - Time range in hours (default: 24)
  - `limit` - Max results (default: 100)
  - `operation` - Filter by CRUD operation (optional)

### 5. DynamoDB Table (`audit-logs`)
- **Partition Key**: `log_id` (String)
- **Global Secondary Indexes**:
  - **AgentIndex**: `agent_id` (PK) + `timestamp` (SK)
  - **OperationIndex**: `crud_operation` (PK) + `timestamp` (SK)
- **Attributes**:
  - `log_id` (String, UUID)
  - `timestamp` (String, ISO 8601)
  - `agent_id` (String)
  - `user_id` (String)
  - `crud_operation` (String: CREATE/READ/UPDATE/DELETE)
  - `entity_type` (String: e.g., "User", "Account", "Transaction")
  - `entity_id` (String)
  - `old_value` (String, optional)
  - `new_value` (String, optional)
  - `ip_address` (String, optional)
  - `user_agent` (String, optional)

## Cost Analysis

### Monthly Costs (Option B - Deployed)

**SQS**:
- 10,000 requests/month × $0.40/1M = **$0.004**

**Lambda Writer**:
- 10,000 invocations × 256 MB × 1 second = 2,560 GB-seconds
- 2,560 GB-seconds × $0.0000166667 = **$0.043**
- 10,000 requests × $0.20/1M = **$0.002**

**Lambda Reader**:
- 1,000 invocations × 256 MB × 1 second = 256 GB-seconds
- 256 GB-seconds × $0.0000166667 = **$0.004**
- 1,000 requests × $0.20/1M = **$0.0002**

**DynamoDB**:
- On-Demand pricing (pay per request)
- 10,000 writes × $1.25/1M = **$0.0125**
- 1,000 reads × $0.25/1M = **$0.00025**

**API Gateway**:
- 1,000 requests × $1.00/1M = **$0.001**

**CloudWatch Logs**:
- ~10 MB/month × $0.50/GB = **$0.005**

**Total**: **~$0.07/month** (99.7% cheaper than Elastic Beanstalk at $28.50/month)

## Deployment

### Prerequisites
1. Python 3.12 installed
2. AWS CLI configured with credentials
3. Terraform >= 1.0
4. Maven 3.9+ (for Java publisher)

### Step 1: Build Lambda Deployment Packages

```bash
# Build audit-writer Lambda
cd infrastructure/terraform/shared/audit-logging/lambda/audit-writer
./build.sh

# Build audit-reader Lambda
cd ../audit-reader
./build.sh
```

This creates `audit-writer.zip` and `audit-reader.zip` with all dependencies bundled.

### Step 2: Deploy Infrastructure

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file="environments/dev.tfvars"

# Apply (creates SQS, Lambda, API Gateway, DynamoDB)
terraform apply -var-file="environments/dev.tfvars"
```

### Step 3: Update Service Configurations

After deployment, Terraform outputs the SQS queue URL. Update your service configurations:

**user-service** (`application.yml`):
```yaml
audit:
  sqs:
    queue:
      url: ${AUDIT_SQS_QUEUE_URL}  # From Terraform output
```

**transaction-processor** (environment variable):
```bash
export AUDIT_SQS_QUEUE_URL="<queue-url-from-terraform>"
```

### Step 4: Update IAM Policies

Attach the SQS publish policy to your service execution roles:

```bash
# Get policy ARN from Terraform output
terraform output audit_sqs_publish_policy_arn

# Attach to user-service ECS task role
aws iam attach-role-policy \
  --role-name user-service-ecs-task-role \
  --policy-arn <audit_sqs_publish_policy_arn>

# Attach to transaction-processor Lambda role
aws iam attach-role-policy \
  --role-name transaction-processor-lambda-role \
  --policy-arn <audit_sqs_publish_policy_arn>
```

## Testing

### Unit Tests (Cost-Free with Mocking)

**Python Lambda Functions**:
```bash
# Test audit-writer
cd infrastructure/terraform/shared/audit-logging/lambda/audit-writer
pip install -r requirements-test.txt
pytest test_lambda_function.py -v --cov=lambda_function

# Test audit-reader
cd ../audit-reader
pip install -r requirements-test.txt
pytest test_lambda_function.py -v --cov=lambda_function
```

**Java Publisher**:
```bash
cd services/shared/java
mvn test
```

**Python Publisher**:
```bash
cd services/shared
pip install -r requirements-test.txt  # Need to create this
pytest test_audit_publisher.py -v
```

### Integration Testing

**1. Test SQS Publishing**:
```bash
# From user-service or transaction-processor
# Should see message in SQS queue
aws sqs get-queue-attributes \
  --queue-url <queue-url> \
  --attribute-names ApproximateNumberOfMessages
```

**2. Test Lambda Writer**:
```bash
# Check CloudWatch Logs
aws logs tail /aws/lambda/<audit-writer-function-name> --follow

# Verify DynamoDB writes
aws dynamodb scan \
  --table-name <audit-logs-table> \
  --limit 10
```

**3. Test API Gateway**:
```bash
# Get JWT token from Cognito
TOKEN=$(aws cognito-idp initiate-auth ...)

# Query audit logs
curl -H "Authorization: Bearer $TOKEN" \
  "https://<api-gateway-url>/api/v1/audit/logs?hours=24&limit=10"
```

## Migration from Synchronous to Async

### Changes Required

**user-service**:
1. Replace `AuditLogger` with `AuditPublisher` in code
2. Update dependency injection (SQS client instead of DynamoDB)
3. Update configuration (`audit.sqs.queue.url` instead of `audit.dynamodb.table.name`)
4. Remove error handling that expects audit failures to cause transaction rollback

**transaction-processor**:
1. Replace `services/shared/audit_logger.py` with `services/shared/audit_publisher.py`
2. Update imports
3. Set `AUDIT_SQS_QUEUE_URL` environment variable
4. Remove DynamoDB client initialization for audit logging

### Behavioral Changes

**Before (Synchronous)**:
- ✅ Strong consistency - audit log written before transaction commits
- ❌ Single point of failure - DynamoDB down = service down
- ❌ Tight coupling - service depends on audit infrastructure
- ❌ Performance impact - blocking I/O on every operation

**After (Asynchronous)**:
- ✅ High availability - service continues even if SQS/Lambda fails
- ✅ Loose coupling - service independent of audit infrastructure
- ✅ Better performance - non-blocking fire-and-forget
- ✅ Built-in retry - SQS + DLQ handles transient failures
- ⚠️ Eventual consistency - ~seconds delay before logs appear in DynamoDB

## Querying Audit Logs

### Agent Role
Agents can only see their own logs:

```bash
GET /api/v1/audit/logs?hours=24&limit=100
Authorization: Bearer <agent-jwt-token>

# Returns logs where agent_id = JWT sub claim
```

### Admin Role
Admins can see all logs with optional operation filtering:

```bash
# All logs from last 48 hours
GET /api/v1/audit/logs?hours=48&limit=200
Authorization: Bearer <admin-jwt-token>

# Only CREATE operations
GET /api/v1/audit/logs?hours=24&operation=CREATE
Authorization: Bearer <admin-jwt-token>
```

### Response Format
```json
{
  "logs": [
    {
      "log_id": "uuid-123",
      "timestamp": "2025-01-23T10:30:00Z",
      "agent_id": "agent-456",
      "user_id": "user-789",
      "crud_operation": "UPDATE",
      "entity_type": "Account",
      "entity_id": "acc-001",
      "old_value": "{\"balance\": 1000}",
      "new_value": "{\"balance\": 1500}",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0"
    }
  ],
  "count": 1
}
```

## Monitoring

### CloudWatch Alarms
- **DLQ Messages**: Alerts when messages fail 3 times and enter DLQ
- **Lambda Errors**: Track Lambda invocation errors
- **API Gateway 4xx/5xx**: Monitor API errors

### CloudWatch Logs
- `/aws/lambda/<audit-writer-function-name>` - Writer logs
- `/aws/lambda/<audit-reader-function-name>` - Reader logs
- `/aws/apigateway/<api-name>` - API Gateway access logs

### Metrics to Monitor
- SQS `ApproximateAgeOfOldestMessage` - Detect processing delays
- Lambda `Duration` - Performance degradation
- DynamoDB `UserErrors` - Throttling issues
- API Gateway `Count` - Request volume

## Security

### Authentication & Authorization
- **API Gateway**: Cognito JWT authorizer validates token signature and expiry
- **Lambda Reader**: Extracts `custom:role` from JWT claims
- **Role-Based Access**: 
  - `agent` → Query own logs via AgentIndex
  - `admin`, `rootAdministrator` → Query all logs

### Network Security
- **Lambda**: No VPC attachment (DynamoDB/SQS are outside VPC anyway)
- **API Gateway**: Public endpoint with JWT auth
- **SQS**: HTTPS only, IAM policy restricts access to services

### Data Security
- **Encryption at Rest**: DynamoDB encrypted with AWS managed keys
- **Encryption in Transit**: TLS 1.2+ for all connections
- **IAM Policies**: Least privilege (services can only publish, Lambda can only read/write)

## Troubleshooting

### Messages Not Appearing in DynamoDB
1. Check SQS queue for messages: `aws sqs get-queue-attributes`
2. Check Lambda Writer CloudWatch Logs for errors
3. Check DLQ for failed messages: `aws sqs receive-message --queue-url <dlq-url>`

### API Gateway Returns 401 Unauthorized
1. Verify JWT token is valid: Check expiry, signature
2. Ensure `custom:role` claim exists in token
3. Check API Gateway CloudWatch Logs for authorization errors

### Lambda Timeout
1. Increase timeout in `lambda-writer.tf` or `lambda-reader.tf`
2. Check if DynamoDB is throttling (increase capacity or use on-demand)
3. Reduce batch size in SQS event source mapping

### High Costs
1. Check DynamoDB pricing mode (on-demand vs provisioned)
2. Review CloudWatch Logs retention (set to 7 days)
3. Monitor API Gateway request volume

## References
- [AWS SQS Best Practices](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)
- [Lambda with SQS](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [API Gateway Cognito Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [DynamoDB Global Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
