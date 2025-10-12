package com.bankingbuddy.audit;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

/**
 * Auto-configuration for mission-critical synchronous audit logging.
 * Provides DynamoDB client for direct database writes.
 */
@Configuration
@EnableConfigurationProperties
public class AuditConfig {
    
    /**
     * DynamoDB client for audit logging.
     * Uses default credential chain (IAM roles, profiles, etc.)
     */
    @Bean
    public DynamoDbClient dynamoDbClient() {
        return DynamoDbClient.builder()
                .region(Region.US_EAST_1) // Default region, can be overridden via AWS_REGION env var
                .build();
    }
}