package com.bankingbuddy.audit;

import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Simple unit tests for AuditLogger basic functionality
 */
class AuditLoggerTest {

    @Test
    void testConstructorInitialization() {
        // Test constructor parameters validation - no actual DynamoDB calls
        String tableName = "test-table";
        String sourceService = "test-service";
        long retentionDays = 365;

        // Since we can't mock DynamoDbClient in Java 25, we'll just test non-null validation
        assertThrows(NullPointerException.class, () -> {
            new AuditLogger(null, tableName, sourceService, retentionDays);
        }, "Should throw NPE for null DynamoDB client");

        assertThrows(IllegalArgumentException.class, () -> {
            DynamoDbClient client = DynamoDbClient.builder().build();
            new AuditLogger(client, null, sourceService, retentionDays);
        }, "Should throw IAE for null table name");

        assertThrows(IllegalArgumentException.class, () -> {
            DynamoDbClient client = DynamoDbClient.builder().build();
            new AuditLogger(client, "", sourceService, retentionDays);
        }, "Should throw IAE for empty table name");
    }

    @Test
    void testAuditExceptionConstruction() {
        String message = "Test error message";
        RuntimeException cause = new RuntimeException("Root cause");
        
        AuditLogger.AuditException exception = new AuditLogger.AuditException(message, cause);
        
        assertEquals(message, exception.getMessage());
        assertEquals(cause, exception.getCause());
    }
}