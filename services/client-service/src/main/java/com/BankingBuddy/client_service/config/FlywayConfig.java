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
 * to ensure repair() is called BEFORE any migration checks happen.
 * 
 * Critical Fix: FlywayMigrationInitializer checks for failed migrations in afterPropertiesSet(),
 * which happens during bean initialization. We override this to call repair() FIRST.
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
     * BEFORE any migration checks. This fixes the issue where Flyway detects
     * failed migrations even when history shows success=1.
     * 
     * The @Primary annotation ensures this REPLACES Spring Boot's auto-configured initializer.
     * We create a custom initializer that overrides afterPropertiesSet() to repair first.
     * 
     * @param flyway The Flyway instance configured by Spring Boot
     * @return Custom FlywayMigrationInitializer that repairs before migration
     */
    @Bean
    @Primary
    @DependsOn("flyway")
    public FlywayMigrationInitializer flywayMigrationInitializer(Flyway flyway) {
        
        log.info("Creating custom Flyway migration initializer with repair-first logic");
        
        // Create custom initializer that repairs BEFORE migrate
        return new FlywayMigrationInitializer(flyway) {
            @Override
            public void afterPropertiesSet() throws Exception {
                // Repair BEFORE any migration checks happen
                log.info("Pre-migration step: Repairing Flyway schema history to clean up any failed migrations...");
                try {
                    flyway.repair();
                    log.info("Flyway repair completed successfully - any failed migration records cleaned");
                } catch (Exception e) {
                    log.error("Flyway repair failed: {}", e.getMessage(), e);
                    // Don't throw - repair failure shouldn't block migration if schema is actually clean
                    log.warn("Continuing with migration despite repair failure");
                }
                
                // Log current migration state before migration
                log.info("Current Flyway migration info: {}", flyway.info());
                
                // Now call parent's afterPropertiesSet() which runs migrate()
                try {
                    super.afterPropertiesSet();
                    log.info("Flyway migration completed successfully");
                } catch (Exception e) {
                    log.error("Flyway migration failed: {}", e.getMessage(), e);
                    log.error("Migration error details: ", e);
                    throw e; // Re-throw to prevent startup with failed migrations
                }
            }
        };
    }
}
