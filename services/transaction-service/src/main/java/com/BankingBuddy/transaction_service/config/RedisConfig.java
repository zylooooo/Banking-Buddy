package com.BankingBuddy.transaction_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.time.Duration;

/**
 * Redis Configuration for ElastiCache
 * 
 * Connects to AWS ElastiCache Redis cluster provisioned via Terraform.
 * Uses primary endpoint from SPRING_REDIS_HOST environment variable.
 * 
 * Configuration:
 * - Redis 7.0 on ElastiCache
 * - Multi-AZ with automatic failover
 * - Port 6379
 * - Transit encryption: disabled (for dev)
 * 
 * Best Practices Implemented:
 * - Type information for proper deserialization of complex types (Page, etc.)
 * - Java 8 time types support (LocalDateTime, etc.)
 * - DRY: Single ObjectMapper factory method
 * - String keys for better readability and debugging
 * - JSON values for complex objects
 * - Cache error handling: Application continues to function if Redis is unavailable (cache-aside pattern)
 */
@Configuration
@EnableCaching
@Profile("aws") // Only enable Redis caching in AWS environment
@Slf4j
public class RedisConfig implements CachingConfigurer {

    @Value("${spring.data.redis.host}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    /**
     * Creates a configured ObjectMapper for Redis serialization.
     * 
     * Best Practices:
     * - JavaTimeModule: Handles Java 8 time types (LocalDateTime, etc.)
     * - Type information: Enables proper deserialization of complex types like Page
     * - Fail on unknown properties: Disabled for forward compatibility
     * - ISO-8601 dates: More readable than timestamps
     * 
     * @return Configured ObjectMapper for Redis
     */
    private ObjectMapper createObjectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        
        // Register Java 8 time module for LocalDateTime, etc.
        objectMapper.registerModule(new JavaTimeModule());
        
        // Use ISO-8601 format instead of timestamps (more readable)
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
        // Don't fail on unknown properties (forward compatibility)
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        
        // Enable type information for proper deserialization of complex types
        // This is CRITICAL for caching Page objects - without this, they deserialize as LinkedHashMap
        // LaissezFaireSubTypeValidator allows all types (safe for caching use case)
        objectMapper.activateDefaultTyping(
            LaissezFaireSubTypeValidator.instance,
            ObjectMapper.DefaultTyping.NON_FINAL
        );
        
        return objectMapper;
    }

    /**
     * Configure Redis connection factory using ElastiCache primary endpoint
     * 
     * Best Practice: Connection pooling is configured via application properties
     * (spring.data.redis.lettuce.pool.*)
     */
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(redisHost);
        config.setPort(redisPort);
        
        // Note: ElastiCache uses primary endpoint for writes, reader endpoint for reads
        // For simplicity, we use primary endpoint for both
        // In production with high read load, consider using reader endpoint for read-only operations
        
        return new LettuceConnectionFactory(config);
    }

    /**
     * Configure RedisTemplate for manual Redis operations (if needed)
     * 
     * Best Practices:
     * - String keys: Human-readable, easier debugging
     * - JSON values: Supports complex objects with type information
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = createObjectMapper();
        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);
        
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // Use String serializer for keys (best practice: readable and efficient)
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        
        // Use JSON serializer for values (supports complex objects with type info)
        template.setValueSerializer(serializer);
        template.setHashValueSerializer(serializer);
        
        template.afterPropertiesSet();
        return template;
    }

    /**
     * Configure CacheManager for Spring Cache abstraction
     * 
     * Best Practices:
     * - TTL: 10 minutes (balances freshness vs performance)
     * - String keys: Readable cache keys
     * - JSON values: Complex object support with type information
     * - No null caching: Saves memory, nulls are typically errors
     * 
     * Cache TTL: 10 minutes (configurable via application properties)
     * Serialization: JSON for values, String for keys
     */
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = createObjectMapper();
        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);
        
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10)) // Cache entries expire after 10 minutes
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer))
                .disableCachingNullValues(); // Don't cache null values (best practice: saves memory)

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }

    /**
     * Configure cache error handler to prevent cache failures from breaking the application.
     * 
     * Best Practice: Cache-aside pattern - if Redis is unavailable, the application
     * continues to function by falling back to the database. Cache errors are logged
     * as warnings but do not propagate as exceptions.
     * 
     * This ensures:
     * - High availability: Application works even if Redis is down
     * - Graceful degradation: Performance degrades but functionality remains
     * - Observability: Errors are logged for monitoring
     * 
     * @return CacheErrorHandler that logs errors but doesn't throw exceptions
     */
    @Override
    @Bean
    public CacheErrorHandler errorHandler() {
        return new SimpleCacheErrorHandler() {
            @Override
            public void handleCacheGetError(@NonNull RuntimeException exception, @NonNull org.springframework.cache.Cache cache, @NonNull Object key) {
                log.warn("Cache get error for key '{}' in cache '{}': {}. Falling back to database query.", 
                    key, cache.getName(), exception.getMessage());
                // Don't throw - allow the method to execute normally (cache-aside pattern)
            }

            @Override
            public void handleCachePutError(@NonNull RuntimeException exception, @NonNull org.springframework.cache.Cache cache, @NonNull Object key, @Nullable Object value) {
                log.warn("Cache put error for key '{}' in cache '{}': {}. Data will not be cached but operation continues.", 
                    key, cache.getName(), exception.getMessage());
                // Don't throw - allow the method to complete successfully
            }

            @Override
            public void handleCacheEvictError(@NonNull RuntimeException exception, @NonNull org.springframework.cache.Cache cache, @NonNull Object key) {
                log.warn("Cache evict error for key '{}' in cache '{}': {}. Cache entry may remain until TTL expires.", 
                    key, cache.getName(), exception.getMessage());
                // Don't throw - eviction failure is not critical
            }

            @Override
            public void handleCacheClearError(@NonNull RuntimeException exception, @NonNull org.springframework.cache.Cache cache) {
                log.warn("Cache clear error for cache '{}': {}. Cache entries may remain until TTL expires.", 
                    cache.getName(), exception.getMessage());
                // Don't throw - clear failure is not critical
            }
        };
    }
}
