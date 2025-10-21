package com.BankingBuddy.client_service.config;

import com.bankingbuddy.audit.AuditPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
public class AwsConfig {
    
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
    
    @Bean
    public AuditPublisher auditPublisher(
            SqsClient sqsClient,
            @Value("${audit.sqs.queue-url}") String queueUrl,
            @Value("${audit.source-service}") String sourceService,
            @Value("${audit.log-retention-days:30}") long retentionDays) {
        return new AuditPublisher(sqsClient, queueUrl, sourceService, retentionDays);
    }
}
