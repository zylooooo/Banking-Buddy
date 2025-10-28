package com.BankingBuddy.transaction_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "aws")
public class AwsProperties {
    
    private String region = "ap-southeast-1";
    private String accessKeyId; // For local dev only
    private String secretAccessKey; // For local dev only
    private Secrets secrets = new Secrets();
    
    @Data
    public static class Secrets {
        private String crmTransactionsDbSecretName;
    }
}
