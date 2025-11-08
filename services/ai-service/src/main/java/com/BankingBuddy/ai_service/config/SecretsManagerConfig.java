package com.BankingBuddy.ai_service.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

/**
 * Configuration for OpenAI API key.
 * Follows the same pattern as client-service's SecretsManagerConfig.
 * 
 * - In AWS (profile=aws): Fetches from Secrets Manager
 * - In Local (no profile): Uses property from application.properties
 */
@Configuration
@Slf4j
public class SecretsManagerConfig {

    @Value("${aws.secrets.openai-api-key-secret-name:}")
    private String openaiApiKeySecretName;

    @Value("${AWS_REGION:ap-southeast-1}")
    private String awsRegion;
    
    @Value("${openai.api.key:}")
    private String openaiApiKeyFromProperties;

    @Value("${spring.profiles.active:local}")
    private String activeProfile;

    @Bean(name = "openaiApiKey")
    public String openaiApiKey() {
        // AWS environment - fetch from Secrets Manager
        if ("aws".equals(activeProfile)) {
            if (openaiApiKeySecretName == null || openaiApiKeySecretName.isEmpty()) {
                throw new RuntimeException("OPENAI_API_KEY_SECRET_NAME is required in AWS environment");
            }

            try {
                log.info("Fetching OpenAI API key from Secrets Manager: {}", openaiApiKeySecretName);
                
                SecretsManagerClient client = SecretsManagerClient.builder()
                        .region(Region.of(awsRegion))
                        .build();

                GetSecretValueRequest request = GetSecretValueRequest.builder()
                        .secretId(openaiApiKeySecretName)
                        .build();

                GetSecretValueResponse response = client.getSecretValue(request);
                String apiKey = response.secretString().trim();

                log.info("Successfully retrieved OpenAI API key from Secrets Manager (length: {})", apiKey.length());
                client.close();
                
                return apiKey;

            } catch (Exception e) {
                log.error("Failed to retrieve OpenAI API key from Secrets Manager: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to retrieve OpenAI API key from Secrets Manager", e);
            }
        }
        
        // Local environment - use from properties
        log.info("Using OpenAI API key from properties (length: {})", 
                openaiApiKeyFromProperties != null ? openaiApiKeyFromProperties.length() : 0);
        return openaiApiKeyFromProperties;
    }
}

