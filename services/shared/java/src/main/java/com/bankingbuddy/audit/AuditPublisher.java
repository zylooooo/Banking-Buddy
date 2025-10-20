package com.bankingbuddy.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageResponse;
import software.amazon.awssdk.services.sqs.model.SqsException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Asynchronous audit logger that publishes messages to SQS.
 * Replaces synchronous DynamoDB writes with fire-and-forget SQS publishing.
 * Non-blocking: CRUD operations continue even if audit publishing fails.
 */
@Component
public class AuditPublisher {
    
    private static final Logger logger = LoggerFactory.getLogger(AuditPublisher.class);
    
    private final SqsClient sqsClient;
    private final String queueUrl;
    private final String sourceService;
    private final long logRetentionDays;
    private final ObjectMapper objectMapper;
    
    public AuditPublisher(SqsClient sqsClient,
                         @Value("${audit.sqs.queue.url}") String queueUrl,
                         @Value("${audit.source.service}") String sourceService,
                         @Value("${audit.log.retention.days:2555}") long logRetentionDays) {
        if (sqsClient == null) {
            throw new NullPointerException("SQS client cannot be null");
        }
        if (queueUrl == null || queueUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("Queue URL cannot be null or empty");
        }
        if (sourceService == null || sourceService.trim().isEmpty()) {
            throw new IllegalArgumentException("Source service cannot be null or empty");
        }
        
        this.sqsClient = sqsClient;
        this.queueUrl = queueUrl;
        this.sourceService = sourceService;
        this.logRetentionDays = logRetentionDays;
        this.objectMapper = new ObjectMapper();
        
        logger.info("AuditPublisher initialized with queue: {}, source: {}, retention: {} days",
                   queueUrl, sourceService, logRetentionDays);
    }
    
    /**
     * Log a CREATE operation by publishing to SQS.
     * @param clientId Client identifier (PK)
     * @param agentId ID of the agent performing the operation
     * @param afterValue Final value after creation
     */
    public void logCreate(String clientId, String agentId, String afterValue) {
        publishAuditMessage("CREATE", clientId, agentId, null, null, afterValue);
    }
    
    /**
     * Log a READ operation by publishing to SQS.
     * @param clientId Client identifier (PK)
     * @param agentId ID of the agent performing the operation
     */
    public void logRead(String clientId, String agentId) {
        publishAuditMessage("READ", clientId, agentId, null, null, null);
    }
    
    /**
     * Log an UPDATE operation by publishing to SQS.
     * @param clientId Client identifier (PK)
     * @param agentId ID of the agent performing the operation
     * @param attributeName Name of the attribute being updated
     * @param beforeValue Original value before update
     * @param afterValue Final value after update
     */
    public void logUpdate(String clientId, String agentId, String attributeName,
                         String beforeValue, String afterValue) {
        publishAuditMessage("UPDATE", clientId, agentId, attributeName, beforeValue, afterValue);
    }
    
    /**
     * Log a DELETE operation by publishing to SQS.
     * @param clientId Client identifier (PK)
     * @param agentId ID of the agent performing the operation
     * @param beforeValue Original value before deletion
     */
    public void logDelete(String clientId, String agentId, String beforeValue) {
        publishAuditMessage("DELETE", clientId, agentId, null, beforeValue, null);
    }
    
    /**
     * Publish audit message to SQS queue asynchronously.
     * Does NOT throw exceptions - logs errors and continues.
     * 
     * @param operation CRUD operation (CREATE, READ, UPDATE, DELETE)
     * @param clientId Client identifier (PK)
     * @param agentId Agent performing the operation
     * @param attributeName Name of the attribute (UPDATE only)
     * @param beforeValue Original value (UPDATE, DELETE)
     * @param afterValue Final value (CREATE, UPDATE)
     */
    private void publishAuditMessage(String operation, String clientId, String agentId,
                                     String attributeName, String beforeValue, String afterValue) {
        // Validate required fields
        if (clientId == null || clientId.trim().isEmpty()) {
            logger.warn("Skipping audit log: client_id is null or empty");
            return;
        }
        if (agentId == null || agentId.trim().isEmpty()) {
            logger.warn("Skipping audit log: agent_id is null or empty");
            return;
        }
        
        // Validate operation-specific fields
        if ("UPDATE".equals(operation)) {
            if (attributeName == null || attributeName.trim().isEmpty()) {
                logger.warn("Skipping audit log: attribute_name required for UPDATE operation");
                return;
            }
            if (beforeValue == null || afterValue == null) {
                logger.warn("Skipping audit log: before_value and after_value required for UPDATE");
                return;
            }
        } else if ("CREATE".equals(operation)) {
            if (afterValue == null) {
                logger.warn("Skipping audit log: after_value required for CREATE operation");
                return;
            }
        } else if ("DELETE".equals(operation)) {
            if (beforeValue == null) {
                logger.warn("Skipping audit log: before_value required for DELETE operation");
                return;
            }
        }
        
        try {
            // Build audit message matching DynamoDB schema
            ObjectNode message = objectMapper.createObjectNode();
            message.put("log_id", UUID.randomUUID().toString());
            message.put("timestamp", Instant.now().toString());
            message.put("client_id", clientId.trim());
            message.put("agent_id", agentId.trim());
            message.put("crud_operation", operation);
            message.put("source_service", sourceService);
            
            // Calculate TTL (retention days from now)
            long ttlEpoch = Instant.now()
                    .plus(logRetentionDays, ChronoUnit.DAYS)
                    .getEpochSecond();
            message.put("ttl", ttlEpoch);
            
            // Add conditional fields based on operation
            if (attributeName != null && !attributeName.isEmpty()) {
                message.put("attribute_name", attributeName);
            }
            if (beforeValue != null && !beforeValue.isEmpty()) {
                message.put("before_value", beforeValue);
            }
            if (afterValue != null && !afterValue.isEmpty()) {
                message.put("after_value", afterValue);
            }
            
            // Convert to JSON string
            String messageBody = objectMapper.writeValueAsString(message);
            
            // Send to SQS
            SendMessageRequest request = SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(messageBody)
                    .build();
            
            SendMessageResponse response = sqsClient.sendMessage(request);
            
            logger.debug("Audit message published to SQS: {} for client {} (MessageId: {})", 
                        operation, clientId, response.messageId());
            
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize audit message to JSON: {}", e.getMessage());
            // Non-blocking: don't throw exception
        } catch (SqsException e) {
            logger.error("Failed to publish audit message to SQS: {} (Code: {})", 
                        e.getMessage(), e.awsErrorDetails().errorCode());
            // Non-blocking: don't throw exception
        } catch (Exception e) {
            logger.error("Unexpected error publishing audit message: {}", e.getMessage(), e);
            // Non-blocking: don't throw exception
        }
    }
}
