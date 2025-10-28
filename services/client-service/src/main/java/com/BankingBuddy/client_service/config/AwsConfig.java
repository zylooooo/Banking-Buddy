package com.BankingBuddy.client_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
public class AwsConfig {
    
    @Bean
    public SecretsManagerClient secretsManagerClient(AwsProperties awsProperties) {
        if (awsProperties.getAccessKeyId() == null || awsProperties.getAccessKeyId().isEmpty()) {
            // Use default credentials provider (for local development with LocalStack or IAM roles)
            return SecretsManagerClient.builder()
                    .region(Region.of(awsProperties.getRegion()))
                    .build();
        }
        
        return SecretsManagerClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(
                                awsProperties.getAccessKeyId(),
                                awsProperties.getSecretAccessKey()
                        )
                ))
                .build();
    }
    
    @Bean
    public SqsClient sqsClient(AwsProperties awsProperties) {
        if (awsProperties.getAccessKeyId() == null || awsProperties.getAccessKeyId().isEmpty()) {
            // Use default credentials provider (for local development with LocalStack or IAM roles)
            return SqsClient.builder()
                    .region(Region.of(awsProperties.getRegion()))
                    .build();
        }
        
        return SqsClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(
                                awsProperties.getAccessKeyId(),
                                awsProperties.getSecretAccessKey()
                        )
                ))
                .build();
    }
    
    @Bean
    public SesClient sesClient(AwsProperties awsProperties) {
        if (awsProperties.getAccessKeyId() == null || awsProperties.getAccessKeyId().isEmpty()) {
            return SesClient.builder()
                    .region(Region.of(awsProperties.getRegion()))
                    .build();
        }
        
        return SesClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(
                                awsProperties.getAccessKeyId(),
                                awsProperties.getSecretAccessKey()
                        )
                ))
                .build();
    }
}
