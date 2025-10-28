package com.BankingBuddy.transaction_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    
    private Security security = new Security();
    private RootAdmin rootAdmin = new RootAdmin();
    private Audit audit = new Audit();
    
    @Data
    public static class Security {
        private boolean enabled = true;
    }
    
    @Data
    public static class RootAdmin {
        private String email = "admin@bankingbuddy.com";
    }
    
    @Data
    public static class Audit {
        private String sqsQueueUrl;
    }
}
