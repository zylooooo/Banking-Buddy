package com.bankingbuddy.audit;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.net.URI;

/**
 * Test configuration using LocalStack for DynamoDB testing.
 * Replaces real AWS resources to eliminate costs.
 */
@TestConfiguration
public class TestContainerConfig {
    
    private static final GenericContainer<?> localstack = new GenericContainer<>(
            DockerImageName.parse("localstack/localstack:latest"))
            .withExposedPorts(4566)
            .withEnv("SERVICES", "dynamodb")
            .withEnv("DEBUG", "1")
            .withReuse(true);
    
    static {
        localstack.start();
    }
    
    @Bean
    @Primary
    public static DynamoDbClient testDynamoDbClient() {
        String endpoint = String.format("http://%s:%d", 
            localstack.getHost(), 
            localstack.getMappedPort(4566));
        
        return DynamoDbClient.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("test", "test")))
                .region(Region.US_EAST_1)
                .build();
    }
    
    @Bean
    @Primary
    public AuditLogger testAuditLogger() {
        return new AuditLogger(
            testDynamoDbClient(),
            "test-audit-logs",
            "test-service",
            2555L // 7 years retention
        );
    }
    
    public static String getLocalStackEndpoint() {
        return String.format("http://%s:%d", 
            localstack.getHost(), 
            localstack.getMappedPort(4566));
    }
    
    public static GenericContainer<?> getLocalStackContainer() {
        return localstack;
    }
}