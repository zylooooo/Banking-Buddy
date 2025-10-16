package com.BankingBuddy.user_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "aws")
public class AwsProperties {
    
    private String region = "ap-southeast-1";
    private String endpoint; // Optional endpoint for LocalStack
    private String accessKeyId;        
    private String secretAccessKey;    
    private Cognito cognito = new Cognito();
    private Secrets secrets = new Secrets();
    
    @Data
    public static class Cognito {
        private String userPoolId;
        private String clientId;
    }
    
    @Data
    public static class Secrets {
        private String crmDbSecretName;
    }
}
