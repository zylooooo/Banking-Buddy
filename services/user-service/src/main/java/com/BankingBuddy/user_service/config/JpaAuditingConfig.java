package com.BankingBuddy.user_service.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing Configuration
 * 
 * Enables automatic population of @CreatedDate and @LastModifiedDate fields
 * in entities with @EntityListeners(AuditingEntityListener.class)
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
    // No additional configuration needed
    // @EnableJpaAuditing activates the auditing feature
}
