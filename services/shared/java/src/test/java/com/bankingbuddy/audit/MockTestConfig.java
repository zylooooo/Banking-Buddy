package com.bankingbuddy.audit;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * Test configuration using mock DynamoDB client for testing.
 * Replaces real AWS resources to eliminate costs.
 * This version doesn't require Docker/Testcontainers.
 */
@TestConfiguration
public class MockTestConfig {
    
    /**
     * Mock DynamoDB client that stores data in memory instead of AWS.
     * Zero AWS costs, zero Docker requirements.
     */
    @Bean
    @Primary
    public DynamoDbClient mockDynamoDbClient() {
        return new MockDynamoDbClient();
    }
    
    @Bean
    @Primary
    public AuditLogger testAuditLogger() {
        return new AuditLogger(
            mockDynamoDbClient(),
            "test-audit-logs",
            "test-service",
            2555L // 7 years retention
        );
    }
    
    public static String getMockEndpoint() {
        return "http://localhost:8000"; // Mock endpoint
    }
    
    /**
     * Mock DynamoDB client that implements only the methods we need for testing.
     * Stores everything in memory instead of making real AWS calls.
     */
    public static class MockDynamoDbClient implements DynamoDbClient {
        private final Map<String, Map<String, Object>> tables = new ConcurrentHashMap<>();
        
        @Override
        public PutItemResponse putItem(PutItemRequest request) {
            String tableName = request.tableName();
            tables.computeIfAbsent(tableName, k -> new ConcurrentHashMap<>());
            
            // Convert DynamoDB attributes to simple map for storage
            Map<String, Object> item = new ConcurrentHashMap<>();
            request.item().forEach((key, value) -> {
                if (value.s() != null) {
                    item.put(key, value.s());
                } else if (value.n() != null) {
                    item.put(key, value.n());
                }
            });
            
            // Store the item (using ID as key if available)
            String itemKey = item.getOrDefault("id", "item-" + System.nanoTime()).toString();
            tables.get(tableName).put(itemKey, item);
            
            return PutItemResponse.builder().build();
        }
        
        @Override
        public DescribeTableResponse describeTable(DescribeTableRequest request) {
            String tableName = request.tableName();
            if (!tables.containsKey(tableName)) {
                throw ResourceNotFoundException.builder()
                    .message("Table not found: " + tableName)
                    .build();
            }
            
            return DescribeTableResponse.builder()
                .table(TableDescription.builder()
                    .tableName(tableName)
                    .tableStatus(TableStatus.ACTIVE)
                    .build())
                .build();
        }
        
        @Override
        public CreateTableResponse createTable(CreateTableRequest request) {
            String tableName = request.tableName();
            tables.put(tableName, new ConcurrentHashMap<>());
            
            return CreateTableResponse.builder()
                .tableDescription(TableDescription.builder()
                    .tableName(tableName)
                    .tableStatus(TableStatus.ACTIVE)
                    .build())
                .build();
        }
        
        @Override
        public ListTablesResponse listTables() {
            return ListTablesResponse.builder()
                .tableNames(tables.keySet())
                .build();
        }
        
        @Override
        public String serviceName() {
            return "dynamodb";
        }
        
        @Override
        public void close() {
            // Mock implementation - nothing to close
        }
        
        // Get stored items for verification in tests
        public Map<String, Object> getStoredItems(String tableName) {
            return tables.getOrDefault(tableName, new ConcurrentHashMap<>());
        }
        
        public int getItemCount(String tableName) {
            return tables.getOrDefault(tableName, new ConcurrentHashMap<>()).size();
        }
    }
}