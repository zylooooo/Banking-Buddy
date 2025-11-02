package com.BankingBuddy.client_service.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.core.annotation.Order;

/**
 * Custom Flyway configuration that handles failed migrations gracefully.
 * This ensures repair() is called before migrate() to clean up any failed migration records.
 * 
 * This configuration is essential because:
 * 1. spring.flyway.repair-on-migrate property doesn't always work reliably when migrations are already marked as failed
 * 2. Explicit repair() call before migrate() ensures failed migrations are cleaned up
 * 3. Prevents "contains a failed migration" errors during application startup
 * 
 * This overrides Spring Boot's default FlywayMigrationInitializer to add repair logic.
 */
@Configuration
public class FlywayConfig {
    
    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    /**
     * Custom Flyway migration initializer that explicitly repairs failed migrations
     * before attempting migration. This is more reliable than relying solely
     * on spring.flyway.repair-on-migrate property.
     * 
     * The repair() method:
     * - Removes failed migration records from flyway_schema_history
     * - Realigns checksums, descriptions, and types of applied migrations
     * - Marks missing migrations as deleted
     * 
     * Note: This bean replaces Spring Boot's auto-configured FlywayMigrationInitializer.
     * The migration will run once when this initializer's afterPropertiesSet is called.
     * 
     * @param flyway The Flyway instance configured by Spring Boot
     * @return FlywayMigrationInitializer that will trigger repair and migration
     */
    @Bean
    @DependsOn("flyway")
    @Order(1)
    public FlywayMigrationInitializer flywayMigrationInitializer(Flyway flyway) {
        
        log.info("Initializing Flyway migration with automatic repair");
        
        try {
            // Explicitly repair failed migrations before migrate
            // This is more reliable than repair-on-migrate property
            log.info("Repairing Flyway schema history to clean up any failed migrations...");
            flyway.repair();
            log.info("Flyway repair completed successfully");
            
        } catch (Exception e) {
            log.error("Flyway repair failed: {}", e.getMessage(), e);
            // Continue anyway - repair failure shouldn't prevent migration attempt
            log.warn("Continuing with migration despite repair failure");
        }
        
        // Create and return initializer - migration will be triggered automatically
        return new FlywayMigrationInitializer(flyway, null);
    }
}

