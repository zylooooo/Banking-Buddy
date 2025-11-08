package com.BankingBuddy.ai_service.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@Slf4j
public class AuthorizationInterceptor implements HandlerInterceptor {
    
    private final ALBUserContextExtractor userContextExtractor;
    
    public AuthorizationInterceptor(ALBUserContextExtractor userContextExtractor) {
        this.userContextExtractor = userContextExtractor;
    }
    
    @Override
    public boolean preHandle(
        @NonNull HttpServletRequest request, 
        @NonNull HttpServletResponse response, 
        @NonNull Object handler) throws Exception {
        
        log.debug("Processing request: {} {} from {}", 
                  request.getMethod(), request.getRequestURI(), request.getRemoteAddr());
        log.debug("Authorization header present: {}", request.getHeader("Authorization") != null);
        
        // Extract user context and store in request attribute
        UserContext userContext = userContextExtractor.extractUserContext(request);
        request.setAttribute("userContext", userContext);
        
        log.info("Request from user: {} with role: {}", 
                 userContext.getEmail(), userContext.getRole());
        
        return true;
    }
}
