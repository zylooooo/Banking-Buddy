package com.BankingBuddy.ai_service.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

/**
 * Configuration to fetch OpenAI API key from AWS Secrets Manager.
 * Follows the same pattern as client-service's SecretsManagerConfig.
 * Creates a bean that provides the API key, which Spring injects where needed.
 */
@Configuration
@Profile("aws") // Only active in AWS environment
@Slf4j
public class SecretsManagerConfig {

    @Value("${aws.secrets.openai-api-key-secret-name}")
    private String openaiApiKeySecretName;

    @Value("${AWS_REGION:ap-southeast-1}")
    private String awsRegion;

    /**
     * Fetches the OpenAI API key from AWS Secrets Manager and provides it as a Spring bean.
     * This bean can be injected wherever needed with @Value("${openai.api.key}")
     * 
     * @return The OpenAI API key
     */
    @Bean(name = "openaiApiKey")
    public String openaiApiKey() {
        if (openaiApiKeySecretName == null || openaiApiKeySecretName.isEmpty()) {
            log.error("OPENAI_API_KEY_SECRET_NAME is required in AWS environment");
            log.error("Current value: '{}'", openaiApiKeySecretName);
            throw new RuntimeException("OPENAI_API_KEY_SECRET_NAME is required in AWS environment");
        }

        try {
            log.info("Fetching OpenAI API key from Secrets Manager: {}", openaiApiKeySecretName);
            log.info("Using AWS Region: {}", awsRegion);
            
            // Retrieve credentials from AWS Secrets Manager
            SecretsManagerClient client = SecretsManagerClient.builder()
                    .region(Region.of(awsRegion))
                    .build();

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(openaiApiKeySecretName)
                    .build();

            GetSecretValueResponse response = client.getSecretValue(request);
            String apiKey = response.secretString().trim();

            log.info("Successfully retrieved OpenAI API key from Secrets Manager (length: {})", apiKey.length());
            
            // Close the client
            client.close();

            return apiKey;

        } catch (Exception e) {
            log.error("Failed to retrieve OpenAI API key from Secrets Manager: {}", e.getMessage(), e);
            log.error("Secret name attempted: {}", openaiApiKeySecretName);
            log.error("AWS Region: {}", awsRegion);
            throw new RuntimeException("Failed to retrieve OpenAI API key from Secrets Manager", e);
        }
    }
}

