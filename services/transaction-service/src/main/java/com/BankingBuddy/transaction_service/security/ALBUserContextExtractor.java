package com.BankingBuddy.transaction_service.security;

import com.BankingBuddy.transaction_service.config.AppProperties;
import com.BankingBuddy.transaction_service.exception.UnauthorizedException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Base64;

@Component
@Slf4j
public class ALBUserContextExtractor {

    private static final String ALB_OIDC_DATA_HEADER = "x-amzn-oidc-data";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AppProperties appProperties;

    public ALBUserContextExtractor(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public UserContext extractUserContext(HttpServletRequest request) {
        if (!appProperties.getSecurity().isEnabled()) {
            return createMockUserContext(); // For local development
        }

        String oidcDataHeader = request.getHeader(ALB_OIDC_DATA_HEADER);

        if (oidcDataHeader == null || oidcDataHeader.isEmpty()) {
            throw new UnauthorizedException("Missing authentication header");
        }

        try {
            // Decode JWT (ALB already validated it)
            String[] parts = oidcDataHeader.split("\\.");
            if (parts.length != 3) {
                throw new UnauthorizedException("Invalid JWT format");
            }

            // Decode payload (second part)
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            JsonNode claims = objectMapper.readTree(payload);

            return UserContext.builder()
                    .userId(claims.get("sub").asText())
                    .email(claims.get("email").asText())
                    .username(claims.get("cognito:username").asText())
                    .role(UserRole.fromString(claims.get("custom:role").asText()))
                    .emailVerified(claims.get("email_verified").asBoolean())
                    .build();

        } catch (Exception e) {
            log.error("Failed to extract user context from ALB header", e);
            throw new UnauthorizedException("Invalid authentication token");
        }
    }

    private UserContext createMockUserContext() {
        // For local development
        return UserContext.builder()
                .userId("mock-user-id")
                .email("test@example.com")
                .username("test@example.com")
                .role(UserRole.ADMIN)
                .emailVerified(true)
                .build();
    }
}
