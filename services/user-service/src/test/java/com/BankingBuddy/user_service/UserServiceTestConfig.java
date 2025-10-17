package com.BankingBuddy.user_service;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import javax.sql.DataSource;
import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;

/**
 * Test configuration using Testcontainers for user service integration tests.
 * Replaces real RDS/Aurora and AWS resources to eliminate costs.
 */
@TestConfiguration
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.show-sql=true",
    "spring.flyway.enabled=false"
})
public class UserServiceTestConfig {
    
    private static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("bankingbuddy_test")
            .withUsername("testuser")
            .withPassword("testpass")
            .withReuse(true);
    
    private static final GenericContainer<?> localstack = new GenericContainer<>(
            DockerImageName.parse("localstack/localstack:latest"))
            .withExposedPorts(4566)
            .withEnv("SERVICES", "dynamodb,secretsmanager")
            .withEnv("DEBUG", "1")
            .withReuse(true);
    
    static {
        mysql.start();
        localstack.start();
    }
    
    @Bean
    @Primary
    public DataSource testDataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(mysql.getJdbcUrl());
        dataSource.setUsername(mysql.getUsername());
        dataSource.setPassword(mysql.getPassword());
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
        return dataSource;
    }
    
    @Bean
    @Primary
    public DynamoDbClient testDynamoDbClient() {
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
    
    public static MySQLContainer<?> getMySQLContainer() {
        return mysql;
    }
    
    public static GenericContainer<?> getLocalStackContainer() {
        return localstack;
    }
}