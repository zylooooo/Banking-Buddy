package com.bankingbuddy.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Mission-critical synchronous audit logger for Spring Boot applications.
 * Writes directly to DynamoDB for immediate consistency.
 * CRUD operations will fail if audit logging fails.
 */
@Component
public class AuditLogger {
    
    private static final Logger logger = LoggerFactory.getLogger(AuditLogger.class);
    
    private final DynamoDbClient dynamoDb;
    private final String tableName;
    private final String sourceService;
    private final long logRetentionDays;
    
    public AuditLogger(DynamoDbClient dynamoDb,
                      @Value("${audit.dynamodb.table.name}") String tableName,
                      @Value("${audit.source.service}") String sourceService,
                      @Value("${audit.log.retention.days:2555}") long logRetentionDays) {
        if (dynamoDb == null) {
            throw new NullPointerException("DynamoDB client cannot be null");
        }
        if (tableName == null) {
            throw new IllegalArgumentException("Table name cannot be null");
        }
        if (tableName.trim().isEmpty()) {
            throw new IllegalArgumentException("Table name cannot be empty");
        }
        if (sourceService == null) {
            throw new IllegalArgumentException("Source service cannot be null");
        }
        if (sourceService.trim().isEmpty()) {
            throw new IllegalArgumentException("Source service cannot be empty");
        }
        
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
        this.sourceService = sourceService;
        this.logRetentionDays = logRetentionDays;
    }
    
        /**
     * Log a CREATE operation.
     * @param clientId ID of the client
     * @param agentId ID of the agent
     * @param afterValue The created value (e.g., "LEE|ABC Street")
     * @throws AuditException if audit logging fails (causes transaction rollback)
     */
    public void logCreate(String clientId, String agentId, String afterValue) {
        writeToDynamoDB("CREATE", clientId, agentId, null, null, afterValue);
    }
    
    /**
     * Log a READ operation.
     * @param clientId ID of the client
     * @param agentId ID of the agent
     * @throws AuditException if audit logging fails (causes transaction rollback)
     */
    public void logRead(String clientId, String agentId) {
        writeToDynamoDB("READ", clientId, agentId, null, null, null);
    }
    
    /**
     * Log an UPDATE operation.
     * @param clientId ID of the client
     * @param agentId ID of the agent
     * @param attributeName Name of the attribute (e.g., "First Name")
     * @param beforeValue Previous value
     * @param afterValue New value
     * @throws AuditException if audit logging fails (causes transaction rollback)
     */
    public void logUpdate(String clientId, String agentId, String attributeName, 
                         String beforeValue, String afterValue) {
        writeToDynamoDB("UPDATE", clientId, agentId, attributeName, beforeValue, afterValue);
    }
    
    /**
     * Log a DELETE operation.
     * @param clientId ID of the client
     * @param agentId ID of the agent
     * @param beforeValue The deleted value (e.g., "LEE|ABC Street")
     * @throws AuditException if audit logging fails (causes transaction rollback)
     */
    public void logDelete(String clientId, String agentId, String beforeValue) {
        writeToDynamoDB("DELETE", clientId, agentId, null, beforeValue, null);
    }
    
    /**
     * Synchronously write audit log directly to DynamoDB.
     * Mission-critical: throws exception if write fails.
     */
    private void writeToDynamoDB(String operation, String clientId, String agentId,
                                String attributeName, String beforeValue, String afterValue) {
        // Validate required fields
        if (clientId == null || clientId.trim().isEmpty()) {
            throw new IllegalArgumentException("Client ID cannot be null or empty");
        }
        if (agentId == null || agentId.trim().isEmpty()) {
            throw new IllegalArgumentException("Agent ID cannot be null or empty");
        }
        if (operation == null || operation.trim().isEmpty()) {
            throw new IllegalArgumentException("Operation cannot be null or empty");
        }
        
        try {
            Instant now = Instant.now();
            String timestamp = now.toString();
            
            // Calculate TTL for automatic deletion
            long ttlEpochSeconds = now.plus(logRetentionDays, ChronoUnit.DAYS).getEpochSecond();
            
            // Build DynamoDB item with required fields
            Map<String, AttributeValue> item = new HashMap<>();
            item.put("client_id", AttributeValue.builder().s(clientId.trim()).build());
            item.put("timestamp", AttributeValue.builder().s(timestamp).build());
            item.put("log_id", AttributeValue.builder().s(UUID.randomUUID().toString()).build());
            item.put("crud_operation", AttributeValue.builder().s(operation.trim()).build());
            item.put("agent_id", AttributeValue.builder().s(agentId.trim()).build());
            item.put("source_service", AttributeValue.builder().s(sourceService).build());
            item.put("ttl", AttributeValue.builder().n(String.valueOf(ttlEpochSeconds)).build());
            
            // Optional fields
            if (attributeName != null && !attributeName.isEmpty()) {
                item.put("attribute_name", AttributeValue.builder().s(attributeName).build());
            }
            if (beforeValue != null && !beforeValue.isEmpty()) {
                item.put("before_value", AttributeValue.builder().s(beforeValue).build());
            }
            if (afterValue != null && !afterValue.isEmpty()) {
                item.put("after_value", AttributeValue.builder().s(afterValue).build());
            }
            
            // Synchronous write to DynamoDB
            PutItemRequest request = PutItemRequest.builder()
                    .tableName(tableName)
                    .item(item)
                    .build();
            
            dynamoDb.putItem(request);
            
            logger.info("Audit log written successfully: {} for client {}", operation, clientId);
            
        } catch (DynamoDbException e) {
            logger.error("DynamoDB audit logging failed: {}", e.getMessage(), e);
            throw new AuditException("Mission-critical audit logging failed: " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Unexpected audit logging error: {}", e.getMessage(), e);
            throw new AuditException("Mission-critical audit logging failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Exception thrown when audit logging fails.
     * Causes transaction rollback in mission-critical operations.
     */
    public static class AuditException extends RuntimeException {
        public AuditException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}