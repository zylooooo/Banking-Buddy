package com.BankingBuddy.client_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aws")
@Data
public class AwsProperties {
    private String region = "ap-southeast-1";
    private String accessKeyId;
    private String secretAccessKey;
    private Sqs sqs = new Sqs();
    private Ses ses = new Ses();
    
    @Data
    public static class Sqs {
        private String queueUrl;
    }
    
    @Data
    public static class Ses {
        private String sourceEmail;
    }
}
