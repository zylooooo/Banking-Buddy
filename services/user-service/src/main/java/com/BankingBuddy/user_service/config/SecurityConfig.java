package com.BankingBuddy.user_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Security Configuration for User Service
 * 
 * Architecture:
 * - Production: AWS ALB validates Cognito JWT tokens
 * - Service: Custom AuthorizationInterceptor extracts user context
 * - Spring Security: Provides HTTP security headers and CORS
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF - not needed for stateless JWT-based API
            .csrf(csrf -> csrf.disable())
            
            // Stateless session - no server-side sessions
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // CORS configuration
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // Security headers
            .headers(headers -> headers
                // Prevent MIME sniffing
                .contentTypeOptions(contentTypeOptions -> {})
                
                // Prevent clickjacking
                .frameOptions(frameOptions -> frameOptions.deny())
                
                // XSS protection for legacy browsers
                .xssProtection(xss -> xss.disable())
                
                // Disable caching for API responses
                .cacheControl(cache -> {})
            )
            
            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints for health checks
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/actuator/info").permitAll()
                
                // Other actuator endpoints - TODO: Restrict in production
                .requestMatchers("/actuator/**").permitAll()
                
                // API endpoints - ALB validates JWT, service validates authorization
                .requestMatchers("/api/**").permitAll()
                
                // Deny everything else
                .anyRequest().denyAll()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Allow all origins for development
        // TODO: Update to specific origins when frontend is deployed
        // Example: List.of("https://app.bankingbuddy.com", "https://admin.bankingbuddy.com")
        configuration.setAllowedOriginPatterns(List.of("*"));
        
        // Allow only HTTP methods used by the API
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        
        // Allow headers expected by the API
        configuration.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "x-amzn-oidc-data" // ALB JWT header
        ));
        
        // Allow credentials (cookies, authorization headers)
        configuration.setAllowCredentials(true);
        
        // Cache preflight requests for 1 hour
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}