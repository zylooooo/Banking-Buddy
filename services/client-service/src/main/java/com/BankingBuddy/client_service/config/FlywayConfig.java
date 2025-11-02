package com.BankingBuddy.client_service.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Primary;

/**
 * Custom Flyway configuration following industry best practices.
 * 
 * This configuration replaces Spring Boot's default FlywayMigrationInitializer
 * to ensure repair() is called before migrate() to clean up any failed migration records.
 * 
 * Best Practices Followed:
 * 1. Minimal custom logic - only repair, let Flyway handle migrations naturally
 * 2. Migrations are split into atomic units (V1 for clients, V2 for accounts)
 * 3. Uses Flyway's built-in repair mechanism, not custom table creation logic
 * 4. Proper baseline is handled via spring.flyway.baseline-on-migrate property
 */
@Configuration
public class FlywayConfig {
    
    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    /**
     * Custom Flyway migration initializer that ensures repair() is called
     * before migrate() to handle any failed migration records.
     * 
     * The @Primary annotation ensures this REPLACES Spring Boot's auto-configured initializer,
     * allowing us to inject repair logic before migration runs.
     * 
     * @param flyway The Flyway instance configured by Spring Boot
     * @return FlywayMigrationInitializer that will trigger migration after repair
     */
    @Bean
    @Primary
    @DependsOn("flyway")
    public FlywayMigrationInitializer flywayMigrationInitializer(Flyway flyway) {
        
        log.info("Initializing Flyway migration with automatic repair");
        
        try {
            // Repair any failed migration records in history before attempting migration
            // This is more reliable than relying solely on spring.flyway.repair-on-migrate
            log.info("Repairing Flyway schema history to clean up any failed migrations...");
            flyway.repair();
            log.info("Flyway repair completed successfully");
            
        } catch (Exception e) {
            log.error("Flyway repair failed: {}", e.getMessage(), e);
            // Don't throw - let FlywayMigrationInitializer handle migration attempt
            // Repair failure shouldn't prevent migration from running
            log.warn("Continuing with migration attempt despite repair failure");
        }
        
        // Return the initializer - migration will be triggered automatically
        log.info("Flyway migration initializer configured successfully");
        return new FlywayMigrationInitializer(flyway, null);
    }
}
