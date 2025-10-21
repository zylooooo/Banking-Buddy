# Audit Logging System - Usage Guide

## Overview

The Banking Buddy audit logging system provides asynchronous, scalable audit trail recording for all CRUD operations. Services simply send JSON messages to an SQS queue - no library dependencies required!

## Architecture

```text
Your Service → SQS Queue → Lambda (audit-writer) → DynamoDB
                                ↓
                          Dead Letter Queue (DLQ)
                          
Query Logs: API Gateway → Lambda (audit-reader) → DynamoDB
```

**Key Points:**

- ✅ **Fully Decoupled** - No direct dependencies between services and audit logging
- ✅ **Fire and Forget** - Send message to SQS and continue processing
- ✅ **Scalable** - Lambda auto-scales, DynamoDB handles high throughput
- ✅ **Role-Based Access** - Agents see only their logs, admins see everything

## Quick Start

### Step 1: Get the SQS Queue URL

The queue URL is available from Terraform outputs:

```bash
cd infrastructure/terraform
terraform output audit_sqs_queue_url
```

**Queue URL Format:**

```HTTP
https://sqs.{region}.amazonaws.com/{account-id}/dev-banking-buddy-audit-logs
```

⚠️ **Important:** The queue URL contains the AWS account ID and will change if resources are torn down and recreated. Always retrieve it from Terraform outputs or use environment variables.

### Step 2: Configure Your Service

Add the queue URL to your service's environment variables:

```bash
# .env file
AUDIT_SQS_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/677761253473/dev-banking-buddy-audit-logs
```

### Step 3: Send Audit Messages

Choose your language and send messages:

#### Python Example

```python
import boto3
import json
from datetime import datetime, timedelta
import uuid

# Initialize SQS client
sqs = boto3.client('sqs', region_name='ap-southeast-1')
queue_url = os.environ['AUDIT_SQS_QUEUE_URL']

# CREATE operation
def log_create(client_id, agent_id, after_value, source_service='user-service'):
    message = {
        'log_id': str(uuid.uuid4()),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'client_id': client_id,
        'agent_id': agent_id,
        'crud_operation': 'CREATE',
        'source_service': source_service,
        'after_value': after_value,
        'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(message)
    )

# UPDATE operation
def log_update(client_id, agent_id, attribute_name, before_value, after_value, source_service='user-service'):
    message = {
        'log_id': str(uuid.uuid4()),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'client_id': client_id,
        'agent_id': agent_id,
        'crud_operation': 'UPDATE',
        'source_service': source_service,
        'attribute_name': attribute_name,
        'before_value': before_value,
        'after_value': after_value,
        'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(message)
    )

# DELETE operation
def log_delete(client_id, agent_id, before_value, source_service='user-service'):
    message = {
        'log_id': str(uuid.uuid4()),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'client_id': client_id,
        'agent_id': agent_id,
        'crud_operation': 'DELETE',
        'source_service': source_service,
        'before_value': before_value,
        'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(message)
    )

# READ operation
def log_read(client_id, agent_id, source_service='user-service'):
    message = {
        'log_id': str(uuid.uuid4()),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'client_id': client_id,
        'agent_id': agent_id,
        'crud_operation': 'READ',
        'source_service': source_service,
        'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(message)
    )
```

#### Java Example

```java
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class AuditLogger {
    private final SqsClient sqsClient;
    private final String queueUrl;
    private final ObjectMapper objectMapper;
    
    public AuditLogger(SqsClient sqsClient, String queueUrl) {
        this.sqsClient = sqsClient;
        this.queueUrl = queueUrl;
        this.objectMapper = new ObjectMapper();
    }
    
    // CREATE operation
    public void logCreate(String clientId, String agentId, String afterValue, String sourceService) {
        Map<String, Object> message = new HashMap<>();
        message.put("log_id", UUID.randomUUID().toString());
        message.put("timestamp", Instant.now().toString());
        message.put("client_id", clientId);
        message.put("agent_id", agentId);
        message.put("crud_operation", "CREATE");
        message.put("source_service", sourceService);
        message.put("after_value", afterValue);
        message.put("ttl", Instant.now().plus(30, ChronoUnit.DAYS).getEpochSecond());
        
        sendMessage(message);
    }
    
    // UPDATE operation
    public void logUpdate(String clientId, String agentId, String attributeName, 
                         String beforeValue, String afterValue, String sourceService) {
        Map<String, Object> message = new HashMap<>();
        message.put("log_id", UUID.randomUUID().toString());
        message.put("timestamp", Instant.now().toString());
        message.put("client_id", clientId);
        message.put("agent_id", agentId);
        message.put("crud_operation", "UPDATE");
        message.put("source_service", sourceService);
        message.put("attribute_name", attributeName);
        message.put("before_value", beforeValue);
        message.put("after_value", afterValue);
        message.put("ttl", Instant.now().plus(30, ChronoUnit.DAYS).getEpochSecond());
        
        sendMessage(message);
    }
    
    // DELETE operation
    public void logDelete(String clientId, String agentId, String beforeValue, String sourceService) {
        Map<String, Object> message = new HashMap<>();
        message.put("log_id", UUID.randomUUID().toString());
        message.put("timestamp", Instant.now().toString());
        message.put("client_id", clientId);
        message.put("agent_id", agentId);
        message.put("crud_operation", "DELETE");
        message.put("source_service", sourceService);
        message.put("before_value", beforeValue);
        message.put("ttl", Instant.now().plus(30, ChronoUnit.DAYS).getEpochSecond());
        
        sendMessage(message);
    }
    
    // READ operation
    public void logRead(String clientId, String agentId, String sourceService) {
        Map<String, Object> message = new HashMap<>();
        message.put("log_id", UUID.randomUUID().toString());
        message.put("timestamp", Instant.now().toString());
        message.put("client_id", clientId);
        message.put("agent_id", agentId);
        message.put("crud_operation", "READ");
        message.put("source_service", sourceService);
        message.put("ttl", Instant.now().plus(30, ChronoUnit.DAYS).getEpochSecond());
        
        sendMessage(message);
    }
    
    private void sendMessage(Map<String, Object> message) {
        try {
            String messageBody = objectMapper.writeValueAsString(message);
            
            SendMessageRequest request = SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(messageBody)
                .build();
            
            sqsClient.sendMessage(request);
        } catch (Exception e) {
            // Log error but don't fail the main operation
            System.err.println("Failed to send audit log: " + e.getMessage());
        }
    }
}
```

#### JavaScript/Node.js Example

```javascript
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { v4: uuidv4 } = require('uuid');

const sqsClient = new SQSClient({ region: 'ap-southeast-1' });
const queueUrl = process.env.AUDIT_SQS_QUEUE_URL;

// CREATE operation
async function logCreate(clientId, agentId, afterValue, sourceService = 'user-service') {
    const message = {
        log_id: uuidv4(),
        timestamp: new Date().toISOString(),
        client_id: clientId,
        agent_id: agentId,
        crud_operation: 'CREATE',
        source_service: sourceService,
        after_value: afterValue,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    };
    
    await sendMessage(message);
}

// UPDATE operation
async function logUpdate(clientId, agentId, attributeName, beforeValue, afterValue, sourceService = 'user-service') {
    const message = {
        log_id: uuidv4(),
        timestamp: new Date().toISOString(),
        client_id: clientId,
        agent_id: agentId,
        crud_operation: 'UPDATE',
        source_service: sourceService,
        attribute_name: attributeName,
        before_value: beforeValue,
        after_value: afterValue,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    };
    
    await sendMessage(message);
}

// DELETE operation
async function logDelete(clientId, agentId, beforeValue, sourceService = 'user-service') {
    const message = {
        log_id: uuidv4(),
        timestamp: new Date().toISOString(),
        client_id: clientId,
        agent_id: agentId,
        crud_operation: 'DELETE',
        source_service: sourceService,
        before_value: beforeValue,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    };
    
    await sendMessage(message);
}

// READ operation
async function logRead(clientId, agentId, sourceService = 'user-service') {
    const message = {
        log_id: uuidv4(),
        timestamp: new Date().toISOString(),
        client_id: clientId,
        agent_id: agentId,
        crud_operation: 'READ',
        source_service: sourceService,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    };
    
    await sendMessage(message);
}

async function sendMessage(message) {
    try {
        const command = new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(message)
        });
        
        await sqsClient.send(command);
    } catch (error) {
        // Log error but don't fail the main operation
        console.error('Failed to send audit log:', error.message);
    }
}

module.exports = { logCreate, logUpdate, logDelete, logRead };
```

## Message Schema

### Required Fields (All Operations)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `log_id` | String (UUID) | Unique identifier for this log entry | `"550e8400-e29b-41d4-a716-446655440000"` |
| `timestamp` | String (ISO 8601) | When the operation occurred | `"2025-10-19T15:19:28Z"` |
| `client_id` | String | Client/customer identifier | `"CLIENT_12345"` |
| `agent_id` | String | Agent/user who performed the operation | `"AGENT_001"` |
| `crud_operation` | String | Operation type | `"CREATE"`, `"READ"`, `"UPDATE"`, `"DELETE"` |
| `source_service` | String | Service that generated the log | `"user-service"`, `"transaction-processor"` |
| `ttl` | Number | Unix timestamp for DynamoDB TTL (30 days) | `1735660800` |

### Conditional Fields

| Field | Required For | Type | Description | Example |
|-------|--------------|------|-------------|---------|
| `after_value` | CREATE, UPDATE | String | New value(s) after operation | `"John Doe <john@example.com>"` |
| `before_value` | UPDATE, DELETE | String | Original value(s) before operation | `"Jane Doe <jane@example.com>"` |
| `attribute_name` | UPDATE | String | Name of the attribute being updated | `"email"`, `"address"` |

### Example Messages

**CREATE Operation:**

```json
{
  "log_id": "75EF3ACB-E531-4BFE-8762-8CC7F7336806",
  "timestamp": "2025-10-19T15:19:19Z",
  "client_id": "CLIENT_001",
  "agent_id": "AGENT_001",
  "crud_operation": "CREATE",
  "source_service": "user-service",
  "after_value": "John Doe|john@example.com|123 Main St",
  "ttl": 1735660759
}
```

**UPDATE Operation:**

```json
{
  "log_id": "54A423E3-15EA-41CD-AA0C-44E7D4AD0315",
  "timestamp": "2025-10-19T15:19:28Z",
  "client_id": "CLIENT_001",
  "agent_id": "AGENT_001",
  "crud_operation": "UPDATE",
  "source_service": "user-service",
  "attribute_name": "email",
  "before_value": "old@example.com",
  "after_value": "new@example.com",
  "ttl": 1735660768
}
```

**DELETE Operation:**

```json
{
  "log_id": "3B7C9A21-4D5E-6F8A-9B0C-1D2E3F4A5B6C",
  "timestamp": "2025-10-19T15:19:37Z",
  "client_id": "CLIENT_002",
  "agent_id": "AGENT_002",
  "crud_operation": "DELETE",
  "source_service": "user-service",
  "before_value": "Jane Smith|jane@example.com|456 Oak Ave",
  "ttl": 1735660777
}
```

**READ Operation:**

```json
{
  "log_id": "9C8D7E6F-5A4B-3C2D-1E0F-A9B8C7D6E5F4",
  "timestamp": "2025-10-19T15:19:44Z",
  "client_id": "CLIENT_002",
  "agent_id": "AGENT_002",
  "crud_operation": "READ",
  "source_service": "user-service",
  "ttl": 1735660784
}
```

## Querying Audit Logs

### Via API Gateway (Production)

Once API Gateway is deployed, query logs using HTTP requests:

**Agent Query (Own Logs Only):**

```bash
curl -X GET "https://{api-id}.execute-api.ap-southeast-1.amazonaws.com/logs?client_id=CLIENT_001&hours=24" \
  -H "Authorization: Bearer {agent-jwt-token}"
```

**Admin Query (All Logs):**

```bash
curl -X GET "https://{api-id}.execute-api.ap-southeast-1.amazonaws.com/logs?hours=24&operation=UPDATE&limit=50" \
  -H "Authorization: Bearer {admin-jwt-token}"
```

### Query Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `client_id` | No | - | Filter by client ID (agents must query their accessible clients) |
| `hours` | No | `24` | Look back window in hours |
| `operation` | No | - | Filter by operation type (CREATE, READ, UPDATE, DELETE) |
| `limit` | No | `100` | Maximum number of results to return |

### Via Lambda (Testing)

For testing or direct invocation:

```bash
# Agent query
aws lambda invoke \
  --function-name dev-banking-buddy-audit-reader \
  --payload '{"requestContext":{"authorizer":{"jwt":{"claims":{"custom:role":"agent","sub":"AGENT_001"}}}},"queryStringParameters":{"client_id":"CLIENT_001"}}' \
  --cli-binary-format raw-in-base64-out \
  response.json

# Admin query
aws lambda invoke \
  --function-name dev-banking-buddy-audit-reader \
  --payload '{"requestContext":{"authorizer":{"jwt":{"claims":{"custom:role":"admin","sub":"ADMIN_001"}}}},"queryStringParameters":{"hours":"48","operation":"UPDATE"}}' \
  --cli-binary-format raw-in-base64-out \
  response.json
```

## IAM Permissions Required

Your service needs SQS permissions to send messages:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:GetQueueUrl"
      ],
      "Resource": "arn:aws:sqs:ap-southeast-1:{account-id}:dev-banking-buddy-audit-logs"
    }
  ]
}
```

**Terraform:** The audit logging module outputs a pre-configured policy ARN:

```hcl
data "terraform_remote_state" "audit" {
  # ... backend config ...
}

resource "aws_iam_role_policy_attachment" "service_audit_publish" {
  role       = aws_iam_role.service_role.name
  policy_arn = data.terraform_remote_state.audit.outputs.audit_sqs_publish_policy_arn
}
```

## Best Practices

### 1. Fire and Forget

Don't wait for SQS response. Send the message asynchronously and continue processing:

```python
# ✅ Good - Async
try:
    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(message))
except Exception as e:
    logger.error(f"Failed to send audit log: {e}")
    # Don't fail the main operation

# ❌ Bad - Blocking
response = sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(message))
if response['ResponseMetadata']['HTTPStatusCode'] != 200:
    raise Exception("Audit log failed")
```

### 2. Use Consistent Identifiers

- `client_id`: Use the database primary key or UUID
- `agent_id`: Use the Cognito `sub` claim from JWT
- `source_service`: Use a consistent service name across your organization

### 3. Structure Values for Readability

Use pipe-delimited format for multi-field values:

```python
# ✅ Good
after_value = f"{user.name}|{user.email}|{user.address}"

# ❌ Bad
after_value = json.dumps({"name": user.name, "email": user.email})  # Hard to read in logs
```

### 4. Set Appropriate TTL

Default is 30 days. Adjust based on compliance requirements:

```python
# 90 days retention
ttl = int((datetime.utcnow() + timedelta(days=90)).timestamp())
```

### 5. Batch When Possible

If logging multiple operations, send multiple messages in one call:

```python
entries = [
    {'Id': '1', 'MessageBody': json.dumps(message1)},
    {'Id': '2', 'MessageBody': json.dumps(message2)},
]
sqs.send_message_batch(QueueUrl=queue_url, Entries=entries)
```

## Troubleshooting

### Messages Not Appearing in DynamoDB

1. **Check Lambda logs:**

   ```bash
   aws logs tail /aws/lambda/dev-banking-buddy-audit-writer --since 5m
   ```

2. **Check for validation errors** - Common issues:
   - Missing required fields
   - Invalid timestamp format (must be ISO 8601 with 'Z')
   - Invalid crud_operation value

3. **Check Dead Letter Queue:**

   ```bash
   aws sqs receive-message --queue-url https://sqs.ap-southeast-1.amazonaws.com/{account-id}/dev-banking-buddy-audit-logs-dlq
   ```

### Queries Returning No Results

1. **Agent queries:** Ensure `agent_id` in the log matches the JWT `sub` claim
2. **Time window:** Increase `hours` parameter (default is 24)
3. **Check DynamoDB directly:**

   ```bash
   aws dynamodb scan --table-name dev-banking-buddy-audit-logs --limit 5
   ```

### Permission Errors

Ensure your service's IAM role has:

- `sqs:SendMessage` on the audit queue
- Proper VPC configuration if Lambda/services are in VPC

## Data Retention

- **DynamoDB TTL:** 30 days (configurable via `ttl` field)
- **CloudWatch Logs:** 7 days (Lambda execution logs)
- **SQS Messages:** 4 days (if not processed)
- **DLQ Messages:** 14 days (failed messages)

## Performance Characteristics

| Metric | Value |
|--------|-------|
| SQS Latency | < 50ms |
| Lambda Cold Start | ~450ms |
| Lambda Warm Execution | 2-10ms |
| DynamoDB Write | ~5ms |
| End-to-End (SQS → DynamoDB) | < 1 second |
| Throughput | 1000s of messages/second |

## Cost Estimation

**For 1 million audit logs per month:**

- SQS: $0.40 (1M requests × $0.40/million)
- Lambda: $0.20 (1M invocations × $0.20/million + compute)
- DynamoDB: $1.25 (write capacity)
- **Total: ~$2/month**

## Support

For issues or questions:

1. Check [AUDIT_LOGGING_TEST_RESULTS.md](./AUDIT_LOGGING_TEST_RESULTS.md) for validated behavior
2. Review Lambda CloudWatch logs for error messages
3. Contact the platform team

---

**Quick Reference:**

- Queue URL: Get from `terraform output audit_sqs_queue_url`
- Required Fields: log_id, timestamp, client_id, agent_id, crud_operation, source_service, ttl
- IAM Policy ARN: Get from `terraform output audit_sqs_publish_policy_arn`
- Test Status: See [AUDIT_LOGGING_TEST_RESULTS.md](./AUDIT_LOGGING_TEST_RESULTS.md)
