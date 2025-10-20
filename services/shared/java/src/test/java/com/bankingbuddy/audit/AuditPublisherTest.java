package com.bankingbuddy.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageResponse;
import software.amazon.awssdk.services.sqs.model.SqsException;
import software.amazon.awssdk.awscore.exception.AwsErrorDetails;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditPublisherTest {
    
    @Mock
    private SqsClient sqsClient;
    
    private AuditPublisher auditPublisher;
    private ObjectMapper objectMapper;
    
    private static final String QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789/audit-logs";
    private static final String SOURCE_SERVICE = "user-service";
    private static final long RETENTION_DAYS = 2555;
    
    @BeforeEach
    void setUp() {
        auditPublisher = new AuditPublisher(sqsClient, QUEUE_URL, SOURCE_SERVICE, RETENTION_DAYS);
        objectMapper = new ObjectMapper();
    }
    
    @Test
    void testConstructorWithNullSqsClient() {
        assertThrows(NullPointerException.class, 
                    () -> new AuditPublisher(null, QUEUE_URL, SOURCE_SERVICE, RETENTION_DAYS));
    }
    
    @Test
    void testConstructorWithNullQueueUrl() {
        assertThrows(IllegalArgumentException.class, 
                    () -> new AuditPublisher(sqsClient, null, SOURCE_SERVICE, RETENTION_DAYS));
    }
    
    @Test
    void testConstructorWithEmptyQueueUrl() {
        assertThrows(IllegalArgumentException.class, 
                    () -> new AuditPublisher(sqsClient, "   ", SOURCE_SERVICE, RETENTION_DAYS));
    }
    
    @Test
    void testConstructorWithNullSourceService() {
        assertThrows(IllegalArgumentException.class,
                    () -> new AuditPublisher(sqsClient, QUEUE_URL, null, RETENTION_DAYS));
    }
    
    @Test
    void testConstructorWithEmptySourceService() {
        assertThrows(IllegalArgumentException.class,
                    () -> new AuditPublisher(sqsClient, QUEUE_URL, "   ", RETENTION_DAYS));
    }
    
    @Test
    void testLogCreateSuccess() throws Exception {
        // Arrange
        SendMessageResponse mockResponse = SendMessageResponse.builder()
                .messageId("msg-123")
                .build();
        when(sqsClient.sendMessage(any(SendMessageRequest.class)))
                .thenReturn(mockResponse);
        
        // Act
        auditPublisher.logCreate("client-001", "agent-002", "TAN|XX");
        
        // Assert
        ArgumentCaptor<SendMessageRequest> requestCaptor = 
                ArgumentCaptor.forClass(SendMessageRequest.class);
        verify(sqsClient).sendMessage(requestCaptor.capture());
        
        SendMessageRequest request = requestCaptor.getValue();
        assertEquals(QUEUE_URL, request.queueUrl());
        
        // Verify message body structure
        JsonNode message = objectMapper.readTree(request.messageBody());
        assertEquals("CREATE", message.get("crud_operation").asText());
        assertEquals("client-001", message.get("client_id").asText());
        assertEquals("agent-002", message.get("agent_id").asText());
        assertEquals("TAN|XX", message.get("after_value").asText());
        assertEquals(SOURCE_SERVICE, message.get("source_service").asText());
        assertNotNull(message.get("log_id"));
        assertNotNull(message.get("timestamp"));
        assertNotNull(message.get("ttl"));
        // CREATE should NOT have these fields
        assertNull(message.get("attribute_name"));
        assertNull(message.get("before_value"));
    }
    
    @Test
    void testLogReadSuccess() throws Exception {
        // Arrange
        SendMessageResponse mockResponse = SendMessageResponse.builder()
                .messageId("msg-456")
                .build();
        when(sqsClient.sendMessage(any(SendMessageRequest.class)))
                .thenReturn(mockResponse);
        
        // Act
        auditPublisher.logRead("client-003", "agent-004");
        
        // Assert
        ArgumentCaptor<SendMessageRequest> requestCaptor = 
                ArgumentCaptor.forClass(SendMessageRequest.class);
        verify(sqsClient).sendMessage(requestCaptor.capture());
        
        JsonNode message = objectMapper.readTree(requestCaptor.getValue().messageBody());
        assertEquals("READ", message.get("crud_operation").asText());
        assertEquals("client-003", message.get("client_id").asText());
        assertEquals("agent-004", message.get("agent_id").asText());
        // READ should NOT have these fields
        assertNull(message.get("attribute_name"));
        assertNull(message.get("before_value"));
        assertNull(message.get("after_value"));
    }
    
    @Test
    void testLogUpdateSuccess() throws Exception {
        // Arrange
        SendMessageResponse mockResponse = SendMessageResponse.builder()
                .messageId("msg-789")
                .build();
        when(sqsClient.sendMessage(any(SendMessageRequest.class)))
                .thenReturn(mockResponse);
        
        // Act
        auditPublisher.logUpdate("client-005", "agent-006", "name", 
                                "LEE|ABC", "TAN|DEF");
        
        // Assert
        ArgumentCaptor<SendMessageRequest> requestCaptor = 
                ArgumentCaptor.forClass(SendMessageRequest.class);
        verify(sqsClient).sendMessage(requestCaptor.capture());
        
        JsonNode message = objectMapper.readTree(requestCaptor.getValue().messageBody());
        assertEquals("UPDATE", message.get("crud_operation").asText());
        assertEquals("client-005", message.get("client_id").asText());
        assertEquals("agent-006", message.get("agent_id").asText());
        assertEquals("name", message.get("attribute_name").asText());
        assertEquals("LEE|ABC", message.get("before_value").asText());
        assertEquals("TAN|DEF", message.get("after_value").asText());
    }
    
    @Test
    void testLogDeleteSuccess() throws Exception {
        // Arrange
        SendMessageResponse mockResponse = SendMessageResponse.builder()
                .messageId("msg-abc")
                .build();
        when(sqsClient.sendMessage(any(SendMessageRequest.class)))
                .thenReturn(mockResponse);
        
        // Act
        auditPublisher.logDelete("client-007", "agent-008", "ABC|XYZ");
        
        // Assert
        ArgumentCaptor<SendMessageRequest> requestCaptor = 
                ArgumentCaptor.forClass(SendMessageRequest.class);
        verify(sqsClient).sendMessage(requestCaptor.capture());
        
        JsonNode message = objectMapper.readTree(requestCaptor.getValue().messageBody());
        assertEquals("DELETE", message.get("crud_operation").asText());
        assertEquals("client-007", message.get("client_id").asText());
        assertEquals("agent-008", message.get("agent_id").asText());
        assertEquals("ABC|XYZ", message.get("before_value").asText());
        // DELETE should NOT have these fields
        assertNull(message.get("attribute_name"));
        assertNull(message.get("after_value"));
    }
    
    @Test
    void testLogCreateWithNullClientId() {
        // Act
        auditPublisher.logCreate(null, "agent-011", "TAN|XX");
        
        // Assert - should not throw, just log warning and skip
        verify(sqsClient, never()).sendMessage(any(SendMessageRequest.class));
    }
    
    @Test
    void testLogCreateWithEmptyAgentId() {
        // Act
        auditPublisher.logCreate("client-012", "   ", "TAN|XX");
        
        // Assert - should not throw, just log warning and skip
        verify(sqsClient, never()).sendMessage(any(SendMessageRequest.class));
    }
    
    @Test
    void testLogUpdateWithNullAttributeName() {
        // Act
        auditPublisher.logUpdate("client-013", "agent-014", null, "LEE|ABC", "TAN|DEF");
        
        // Assert - should not throw, just log warning and skip
        verify(sqsClient, never()).sendMessage(any(SendMessageRequest.class));
    }
    
    @Test
    void testLogUpdateWithoutBeforeValue() {
        // Act
        auditPublisher.logUpdate("client-015", "agent-016", "name", null, "TAN|DEF");
        
        // Assert - should not throw, just log warning and skip
        verify(sqsClient, never()).sendMessage(any(SendMessageRequest.class));
    }
    
    @Test
    void testSqsExceptionDoesNotThrow() {
        // Arrange
        SqsException sqsException = (SqsException) SqsException.builder()
                .message("Service temporarily unavailable")
                .awsErrorDetails(AwsErrorDetails.builder()
                        .errorCode("ServiceUnavailable")
                        .build())
                .build();
        when(sqsClient.sendMessage(any(SendMessageRequest.class)))
                .thenThrow(sqsException);
        
        // Act & Assert - should not throw exception
        assertDoesNotThrow(() -> 
            auditPublisher.logCreate("client-017", "agent-018", "TAN|XX")
        );
        
        verify(sqsClient).sendMessage(any(SendMessageRequest.class));
    }
    
    @Test
    void testUnexpectedExceptionDoesNotThrow() {
        // Arrange
        when(sqsClient.sendMessage(any(SendMessageRequest.class)))
                .thenThrow(new RuntimeException("Unexpected error"));
        
        // Act & Assert - should not throw exception
        assertDoesNotThrow(() -> 
            auditPublisher.logRead("client-019", "agent-020")
        );
        
        verify(sqsClient).sendMessage(any(SendMessageRequest.class));
    }
}
