package com.BankingBuddy.client_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configuration for async execution
 * Used for non-blocking email sending via SES
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Configure thread pool for async operations
     * Used by @Async annotated methods (e.g., EmailService.sendVerificationEmail)
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-email-");
        executor.initialize();
        return executor;
    }
}
