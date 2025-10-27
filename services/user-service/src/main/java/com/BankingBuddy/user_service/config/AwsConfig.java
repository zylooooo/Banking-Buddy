package com.BankingBuddy.user_service.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClientBuilder;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClientBuilder;

import java.net.URI;

@Configuration
@Slf4j
public class AwsConfig {
    
    private final AwsProperties awsProperties;
    
    public AwsConfig(AwsProperties awsProperties) {
        this.awsProperties = awsProperties;
    }
    
    @Bean
    public SecretsManagerClient secretsManagerClient() {
        log.info("Configuring Secrets Manager client for region: {}", awsProperties.getRegion());
        
        SecretsManagerClientBuilder builder = SecretsManagerClient.builder()
            .region(Region.of(awsProperties.getRegion()));
        
        // ADD THIS: Only use explicit credentials for local development
        if (awsProperties.getAccessKeyId() != null && 
            !awsProperties.getAccessKeyId().isEmpty() &&
            awsProperties.getSecretAccessKey() != null &&
            !awsProperties.getSecretAccessKey().isEmpty()) {
            
            log.info("Using explicit credentials for local development");
            builder.credentialsProvider(software.amazon.awssdk.auth.credentials.StaticCredentialsProvider.create(
                software.amazon.awssdk.auth.credentials.AwsBasicCredentials.create(
                    awsProperties.getAccessKeyId(),
                    awsProperties.getSecretAccessKey()
                )
            ));
        } else {
            log.info("Using IAM instance profile credentials (AWS environment)");
            // No credentials provider specified = uses IAM role automatically
        }
        
        // Add endpoint override for LocalStack
        if (awsProperties.getEndpoint() != null && !awsProperties.getEndpoint().isEmpty()) {
            log.info("Using custom endpoint for Secrets Manager: {}", awsProperties.getEndpoint());
            builder.endpointOverride(URI.create(awsProperties.getEndpoint()));
        }
        
        return builder.build();
    }
    
    @Bean
    public CognitoIdentityProviderClient cognitoClient() {
        log.info("Configuring Cognito client for region: {}", awsProperties.getRegion());
        
        CognitoIdentityProviderClientBuilder builder = CognitoIdentityProviderClient.builder()
            .region(Region.of(awsProperties.getRegion()));
        
        // ADD THIS: Only use explicit credentials for local development
        if (awsProperties.getAccessKeyId() != null && 
            !awsProperties.getAccessKeyId().isEmpty() &&
            awsProperties.getSecretAccessKey() != null &&
            !awsProperties.getSecretAccessKey().isEmpty()) {
            
            log.info("Using explicit credentials for local development");
            builder.credentialsProvider(software.amazon.awssdk.auth.credentials.StaticCredentialsProvider.create(
                software.amazon.awssdk.auth.credentials.AwsBasicCredentials.create(
                    awsProperties.getAccessKeyId(),
                    awsProperties.getSecretAccessKey()
                )
            ));
        } else {
            log.info("Using IAM instance profile credentials (AWS environment)");
            // No credentials provider specified = uses IAM role automatically
        }
        
        // Add endpoint override for LocalStack
        if (awsProperties.getEndpoint() != null && !awsProperties.getEndpoint().isEmpty()) {
            log.info("Using custom endpoint for Cognito: {}", awsProperties.getEndpoint());
            builder.endpointOverride(URI.create(awsProperties.getEndpoint()));
        }
        
        return builder.build();
    }
}
