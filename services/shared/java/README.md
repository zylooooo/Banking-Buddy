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
- **Spring Boot**: 3.2.0
- **AWS SDK**: 2.21.0
- **JUnit**: 5.10.1

### AWS Lambda Deployment

This service is compatible with AWS Lambda Java 21 runtime (`java21`).

## Testing

All tests verify:
- DynamoDB connectivity and audit log persistence
- Cross-service integration capabilities
- Constructor validation and error handling
- Concurrent operation support

Run tests with:
```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home mvn test
```