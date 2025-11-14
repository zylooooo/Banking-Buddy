package com.BankingBuddy.client_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis caching configuration for client service.
 * Supports both AWS ElastiCache and local Docker Redis.
 * 
 * Cache Strategy: Cache-aside pattern with differentiated TTLs per cache region
 * Error Handling: Graceful degradation - cache failures don't break the application
 * 
 * Cache Regions:
 * - clients-list: Agent's paginated client list (5 min TTL)
 * - clients-single: Individual client details (10 min TTL)
 * - accounts-by-client: Client's accounts (10 min TTL)
 */
@Configuration
@EnableCaching
@Slf4j
public class RedisConfig implements CachingConfigurer {

    @Value("${spring.data.redis.host}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    /**
     * Configures ObjectMapper for Redis JSON serialization.
     * Enables Java 8 time support and type information for proper deserialization.
     */
    private ObjectMapper createObjectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        objectMapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        
        // Required for Spring Cache - ensures correct type deserialization
        objectMapper.activateDefaultTyping(
            objectMapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL
        );
        
        return objectMapper;
    }

    /**
     * Configures Redis connection factory.
     * Connection pooling settings are in application properties.
     */
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(redisHost);
        config.setPort(redisPort);
        log.info("Connecting to Redis at {}:{}", redisHost, redisPort);
        return new LettuceConnectionFactory(config);
    }

    /**
     * Configures Spring Cache Manager with differentiated TTLs per cache region.
     * 
     * Cache Regions:
     * - clients-list: 5-minute TTL (changes frequently with CRUD operations)
     * - clients-single: 10-minute TTL (individual client details, moderate changes)
     * - accounts-by-client: 10-minute TTL (rarely changes)
     */
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = createObjectMapper();
        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);
        
        // Default cache configuration (10 minutes)
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer))
                .disableCachingNullValues()
                .prefixCacheNameWith("client-service:");

        // Specialized cache configurations with different TTLs
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        cacheConfigurations.put("clients-list", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigurations.put("clients-single", defaultConfig.entryTtl(Duration.ofMinutes(10)));
        cacheConfigurations.put("accounts-by-client", defaultConfig.entryTtl(Duration.ofMinutes(10)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .transactionAware()
                .build();
    }

    /**
     * Handles cache errors gracefully to prevent application failures.
     * Cache errors are logged as warnings and the application falls back to the database.
     */
    @Override
    @Bean
    public CacheErrorHandler errorHandler() {
        return new SimpleCacheErrorHandler() {
            @Override
            public void handleCacheGetError(@NonNull RuntimeException exception, @NonNull org.springframework.cache.Cache cache, @NonNull Object key) {
                log.warn("Cache GET failed for cache='{}' key='{}': {}. Falling back to database.", 
                        cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCachePutError(@NonNull RuntimeException exception, @NonNull org.springframework.cache.Cache cache, @NonNull Object key, @Nullable Object value) {
                log.warn("Cache PUT failed for cache='{}' key='{}': {}. Data not cached.", 
                        cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(@NonNull RuntimeException exception, @NonNull org.springframework.cache.Cache cache, @NonNull Object key) {
                log.warn("Cache EVICT failed for cache='{}' key='{}': {}", 
                        cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheClearError(@NonNull RuntimeException exception, @NonNull org.springframework.cache.Cache cache) {
                log.warn("Cache CLEAR failed for cache='{}': {}", 
                        cache.getName(), exception.getMessage());
            }
        };
    }
}

