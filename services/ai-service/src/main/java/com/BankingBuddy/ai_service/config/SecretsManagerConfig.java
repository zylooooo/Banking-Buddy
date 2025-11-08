package com.BankingBuddy.ai_service.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import java.util.HashMap;
import java.util.Map;

@Configuration
@Profile("aws") // Only active in AWS environment
@Slf4j
public class SecretsManagerConfig {
    
    @Value("${OPENAI_API_KEY_SECRET_NAME:}")
    private String openaiApiKeySecretName;
    
    @Value("${AWS_REGION:ap-southeast-1}")
    private String awsRegion;
    
    private final ConfigurableEnvironment environment;
    private final SecretsManagerClient secretsManagerClient;
    
    public SecretsManagerConfig(ConfigurableEnvironment environment, SecretsManagerClient secretsManagerClient) {
        this.environment = environment;
        this.secretsManagerClient = secretsManagerClient;
    }
    
    @Bean
    @DependsOn("secretsManagerClient")
    public String openaiApiKeyFromSecretsManager() {
        if (openaiApiKeySecretName == null || openaiApiKeySecretName.isEmpty()) {
            log.warn("OPENAI_API_KEY_SECRET_NAME not set - OpenAI API key will not be fetched from Secrets Manager");
            return "";
        }
        
        try {
            log.info("Fetching OpenAI API key from Secrets Manager: {}", openaiApiKeySecretName);
            
            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(openaiApiKeySecretName)
                    .build();
            
            GetSecretValueResponse response = secretsManagerClient.getSecretValue(request);
            String apiKey = response.secretString().trim();
            
            log.info("Successfully retrieved OpenAI API key from Secrets Manager (length: {})", 
                    apiKey.length());
            
            // Add the property to Spring's environment so @Value can read it
            Map<String, Object> properties = new HashMap<>();
            properties.put("openai.api.key", apiKey);
            MapPropertySource propertySource = new MapPropertySource("secretsManager", properties);
            environment.getPropertySources().addFirst(propertySource);
            
            log.info("OpenAI API key has been added to Spring environment");
            
            return apiKey;
            
        } catch (Exception e) {
            log.error("Failed to retrieve OpenAI API key from Secrets Manager: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to retrieve OpenAI API key from Secrets Manager", e);
        }
    }
}

