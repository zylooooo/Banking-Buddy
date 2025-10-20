# Banking Buddy Audit Logging Service

## Java Version Requirements

This project requires **Java 21** for compilation and runtime.

### Prerequisites

- Java 21 (OpenJDK or Oracle JDK)
- Maven 3.9+

### Building the Project

```bash
# Ensure Java 21 is active
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home

# Build the project
mvn clean compile

# Run tests
mvn test

# Package JAR
mvn package
```

### Version Compatibility

- **Java**: 21 (LTS)
- **Spring Boot**: 3.3.5
- **AWS SDK**: 2.28.25
- **JUnit**: 5.11.3

### AWS Lambda Deployment

This service is compatible with AWS Lambda Java 21 runtime (`java21`).

## Testing

All tests verify:
- DynamoDB connectivity and audit log persistence
- Cross-service integration capabilities
- Constructor validation and error handling
- Concurrent operation support

Run tests with:
# Banking Buddy Audit Logging - Java Publisher

## Overview

This library provides a **Spring Boot component** for publishing audit logs to SQS. It's a fire-and-forget, non-blocking approach that won't slow down your CRUD operations.

**Note:** This is NOT required for services to use audit logging. Services can send JSON directly to the SQS queue. This library is provided as a convenience for Spring Boot applications.

## Quick Start

### Add Dependency

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.bankingbuddy</groupId>
    <artifactId>audit-publisher</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Configure in application.properties

```properties
audit.sqs.queue.url=https://sqs.ap-southeast-1.amazonaws.com/{account-id}/dev-banking-buddy-audit-logs
audit.source.service=user-service
audit.log.retention.days=30
```

### Use in Your Service

```java
@Service
public class UserService {
    
    private final AuditPublisher auditPublisher;
    
    public UserService(AuditPublisher auditPublisher) {
        this.auditPublisher = auditPublisher;
    }
    
    public void updateUser(String clientId, String agentId, User user) {
        // Update user in database
        User oldUser = userRepository.findById(clientId);
        userRepository.save(user);
        
        // Log the audit (non-blocking, fire-and-forget)
        auditPublisher.logUpdate(
            clientId,
            agentId,
            "email",
            oldUser.getEmail(),
            user.getEmail()
        );
    }
}
```

## API Reference

### CREATE Operation
```java
auditPublisher.logCreate(clientId, agentId, afterValue);
```

### READ Operation
```java
auditPublisher.logRead(clientId, agentId);
```

### UPDATE Operation
```java
auditPublisher.logUpdate(clientId, agentId, attributeName, beforeValue, afterValue);
```

### DELETE Operation
```java
auditPublisher.logDelete(clientId, agentId, beforeValue);
```

## Development

### Requirements

- Java 21 (OpenJDK or Oracle JDK)
- Maven 3.9+

### Build

```bash
# Ensure Java 21 is active
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home

# Build the project
mvn clean compile

# Run tests
mvn test

# Package JAR
mvn package
```

### Version Compatibility

- **Java**: 21 (LTS)
- **Spring Boot**: 3.3.5
- **AWS SDK**: 2.28.25
- **JUnit**: 5.11.3

## Testing

Tests verify:
- SQS message publishing
- Error handling (non-blocking on failure)
- Message format validation

```bash
mvn test
```

## Documentation

For complete usage guide including Python and JavaScript examples, see:
- [AUDIT_LOGGING_USAGE_GUIDE.md](../../../docs/AUDIT_LOGGING_USAGE_GUIDE.md)
- [AUDIT_LOGGING_TEST_RESULTS.md](../../../docs/AUDIT_LOGGING_TEST_RESULTS.md)