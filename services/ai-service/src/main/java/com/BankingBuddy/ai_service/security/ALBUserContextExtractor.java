package com.BankingBuddy.ai_service.security;

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
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    public UserContext extractUserContext(HttpServletRequest request) {

        // Try standard Authorization Bearer token first (primary method, consistent with other services)
        String authorizationHeader = request.getHeader(AUTHORIZATION_HEADER);
        if (authorizationHeader != null && authorizationHeader.startsWith(BEARER_PREFIX)) {
            log.debug("Found Authorization Bearer header, extracting user context from JWT");
            String jwtToken = authorizationHeader.substring(BEARER_PREFIX.length());
            return extractFromJWT(jwtToken);
        }

        // Fallback: Try ALB format (for backward compatibility or if ALB adds it automatically)
        String oidcDataHeader = request.getHeader(ALB_OIDC_DATA_HEADER);
        if (oidcDataHeader != null && !oidcDataHeader.isEmpty()) {
            log.debug("Found ALB OIDC header, extracting user context from ALB format");
            return extractFromALBHeader(oidcDataHeader);
        }

        throw new UnauthorizedException("Missing authentication header (Authorization Bearer or x-amzn-oidc-data)");
    }

    // Extract user context from ALB OIDC header
    private UserContext extractFromALBHeader(String oidcDataHeader) {
        try {
            // Decode JWT (ALB already validated it)
            String[] parts = oidcDataHeader.split("\\.");
            if (parts.length != 3) {
                throw new UnauthorizedException("Invalid JWT format");
            }

            // Decode payload (second part)
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            JsonNode claims = objectMapper.readTree(payload);

            return buildUserContextFromClaims(claims);

        } catch (Exception e) {
            log.error("Failed to extract user context from ALB header", e);
            throw new UnauthorizedException("Invalid authentication token");
        }
    }

    // Extract user context from standard JWT Bearer token
    private UserContext extractFromJWT(String jwtToken) {
        try {
            // Decode JWT (skip validation for testing - in production ALB validates)
            String[] parts = jwtToken.split("\\.");
            if (parts.length != 3) {
                throw new UnauthorizedException("Invalid JWT format");
            }

            // Decode payload (second part)
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            JsonNode claims = objectMapper.readTree(payload);

            log.debug("JWT Claims: {}", claims.toPrettyString());

            return buildUserContextFromClaims(claims);

        } catch (Exception e) {
            log.error("Failed to extract user context from JWT token", e);
            throw new UnauthorizedException("Invalid authentication token");
        }
    }

    // Build UserContext from JWT claims
    private UserContext buildUserContextFromClaims(JsonNode claims) {
        try {
            String userId = claims.has("sub") ? claims.get("sub").asText() : null;
            String email = claims.has("email") ? claims.get("email").asText() : null;
            String username = claims.has("cognito:username") ? claims.get("cognito:username").asText() : 
                            (claims.has("username") ? claims.get("username").asText() : null);
            
            // Extract role from custom:role attribute
            String roleValue = null;
            if (claims.has("custom:role")) {
                roleValue = claims.get("custom:role").asText();
            } else if (claims.has("cognito:groups")) {
                // Fallback: check cognito:groups array
                JsonNode groups = claims.get("cognito:groups");
                if (groups.isArray() && groups.size() > 0) {
                    roleValue = groups.get(0).asText();
                }
            }

            if (roleValue == null) {
                log.error("No role found in JWT claims. Claims: {}", claims.toPrettyString());
                throw new UnauthorizedException("Missing role in JWT token");
            }

            boolean emailVerified = claims.has("email_verified") && claims.get("email_verified").asBoolean();

            UserContext userContext = UserContext.builder()
                    .userId(userId)
                    .email(email)
                    .username(username)
                    .role(UserRole.fromString(roleValue))
                    .emailVerified(emailVerified)
                    .build();

            log.info("Extracted user context: userId={}, email={}, username={}, role={}", 
                    userId, email, username, roleValue);

            return userContext;

        } catch (Exception e) {
            log.error("Failed to build user context from claims", e);
            throw new UnauthorizedException("Invalid JWT claims");
        }
    }
}
