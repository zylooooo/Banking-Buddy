package com.BankingBuddy.ai_service.controller;

import com.BankingBuddy.ai_service.model.dto.QueryRequest;
import com.BankingBuddy.ai_service.model.dto.QueryResponse;
import com.BankingBuddy.ai_service.service.NaturalLanguageQueryService;
import com.BankingBuddy.ai_service.security.UserContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/query")
@Slf4j
public class NaturalLanguageQueryController {
    
    private final NaturalLanguageQueryService queryService;
    
    public NaturalLanguageQueryController(NaturalLanguageQueryService queryService) {
        this.queryService = queryService;
    }
    
    @PostMapping
    public ResponseEntity<QueryResponse> processQuery(
            @Valid @RequestBody QueryRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            UserContext userContext = (UserContext) httpRequest.getAttribute("userContext");
            if (userContext == null) {
                log.error("UserContext is null - authorization interceptor may have failed");
                return ResponseEntity.status(401)
                    .body(QueryResponse.builder()
                        .naturalLanguageResponse("Authentication required")
                        .queryType("error")
                        .build());
            }
            
            log.info("Processing natural language query from user {} (role: {}): {}", 
                    userContext.getUserId(), userContext.getRole(), request.getQuery());
            
            // Extract auth token from request
            String authToken = httpRequest.getHeader("Authorization");
            if (authToken != null && authToken.startsWith("Bearer ")) {
                authToken = authToken.substring(7);
            } else {
                // Also check x-amzn-oidc-data header (ALB token)
                String albToken = httpRequest.getHeader("x-amzn-oidc-data");
                if (albToken != null) {
                    authToken = albToken;
                }
            }
            
            if (authToken == null || authToken.isEmpty()) {
                log.warn("No auth token found in request headers");
            }
            
            // Process query using non-streaming method
            QueryResponse response = queryService.processQuery(request, authToken, userContext);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error processing query: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                .body(QueryResponse.builder()
                    .naturalLanguageResponse("An error occurred while processing your query: " + e.getMessage())
                    .queryType("error")
                    .build());
        }
    }

}
