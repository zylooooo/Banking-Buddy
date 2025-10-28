package com.BankingBuddy.client_service.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import javax.sql.DataSource;

@Configuration
@Profile("aws") // Only active in AWS environment
public class SecretsManagerConfig {

    @Value("${aws.secrets.crm-clients-db-secret-name}")
    private String crmClientsDbSecretName;

    @Value("${AWS_REGION:ap-southeast-1}")
    private String awsRegion;

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Bean
    @Primary
    public DataSource dataSource() {
        if (crmClientsDbSecretName == null || crmClientsDbSecretName.isEmpty()) {
            throw new RuntimeException("CRM_CLIENTS_DB_SECRET_NAME is required in AWS environment");
        }

        try {
            // Retrieve credentials from AWS Secrets Manager
            SecretsManagerClient client = SecretsManagerClient.builder()
                    .region(Region.of(awsRegion))
                    .build();

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(crmClientsDbSecretName)
                    .build();

            GetSecretValueResponse response = client.getSecretValue(request);
            String secret = response.secretString();

            // Parse the JSON secret
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode secretJson = objectMapper.readTree(secret);

            String username = secretJson.get("username").asText();
            String password = secretJson.get("password").asText();

            System.out.println("Successfully retrieved database credentials from Secrets Manager");
            System.out.println("Connecting to database with user: " + username);

            // Build DataSource with credentials from Secrets Manager
            return DataSourceBuilder.create()
                    .url(dbUrl)
                    .username(username)
                    .password(password)
                    .driverClassName("com.mysql.cj.jdbc.Driver")
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve database credentials from Secrets Manager", e);
        }
    }
}
