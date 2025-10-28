package com.BankingBuddy.client_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
@Data
public class AppProperties {
    private Security security = new Security();
    private Audit audit = new Audit();
    
    @Data
    public static class Security {
        private boolean enabled = true; // Default to true, override in application.properties
    }
    
    @Data
    public static class Audit {
        private String sqsQueueUrl;
    }
}