package com.BankingBuddy.client_service.config;

import com.BankingBuddy.client_service.security.UserContext;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * Custom key generator for paginated client list caching.
 * Ensures consistent, collision-free cache keys based on agent ID and pagination params.
 * 
 * Cache Key Format: "agent:{agentId}:page:{page}:limit:{limit}"
 * Example: "agent:USR-123:page:0:limit:10"
 */
@Component("clientListKeyGenerator")
public class ClientCacheKeyGenerator implements KeyGenerator {
    
    @NonNull
    @Override
    public Object generate(@NonNull Object target, @NonNull Method method, @NonNull Object... params) {
        if (params.length < 3) {
            throw new IllegalArgumentException("Expected at least 3 parameters: page, limit, userContext");
        }
        
        int page = (int) params[0];
        int limit = (int) params[1];
        UserContext userContext = (UserContext) params[2];
        
        return String.format("agent:%s:page:%d:limit:%d",
                userContext.getUserId(),
                page,
                limit
        );
    }
}

