package com.BankingBuddy.transaction_service.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
    // No additional configuration needed
    // @EnableJpaAuditing activates the auditing feature
}
