package com.BankingBuddy.ai_service.controller;

import com.BankingBuddy.ai_service.model.dto.ApiResponse;
import com.BankingBuddy.ai_service.model.dto.GuideRequest;
import com.BankingBuddy.ai_service.model.dto.GuideResponse;
import com.BankingBuddy.ai_service.service.AiGuideService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai/guide")
@Slf4j
public class AiGuideController {
    
    private final AiGuideService aiGuideService;
    
    public AiGuideController(AiGuideService aiGuideService) {
        this.aiGuideService = aiGuideService;
    }
    
    @PostMapping("/ask")
    public ResponseEntity<ApiResponse<GuideResponse>> askQuestion(
            @Valid @RequestBody GuideRequest request,
            HttpServletRequest httpRequest) {
        log.info("AI Guide question received: {}", request.getQuestion());
        
        // Extract UserContext from request attributes (set by authorization interceptor)
        com.BankingBuddy.ai_service.security.UserContext userContext = 
            (com.BankingBuddy.ai_service.security.UserContext) httpRequest.getAttribute("userContext");
        
        if (userContext == null) {
            log.error("UserContext is null - authorization interceptor may have failed");
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Authentication required"));
        }
        
        log.info("Processing AI Guide question for user {} (role: {})", 
                 userContext.getUserId(), userContext.getRole());
        
        GuideResponse response = aiGuideService.answerQuestion(request, userContext);
        
        return ResponseEntity.ok(ApiResponse.success(response, "Answer generated successfully"));
    }
}
