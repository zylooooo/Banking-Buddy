package com.BankingBuddy.ai_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class OpenAIService {
    
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final boolean hasApiKey;
    
    public OpenAIService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${OPENAI_API_KEY:}") String apiKey,
            @Value("${OPENAI_API_URL:https://api.openai.com/v1}") String apiUrl) {
        this.objectMapper = objectMapper;
        
        // Clean and validate API key
        this.apiKey = (apiKey != null) ? apiKey.trim() : "";
        this.hasApiKey = !this.apiKey.isEmpty() && !this.apiKey.isBlank();
        
        // Build WebClient - conditionally add Authorization header
        WebClient.Builder builder = webClientBuilder
                .baseUrl(apiUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        
        if (hasApiKey) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + this.apiKey);
            log.info("OpenAI API key configured (length: {})", this.apiKey.length());
        } else {
            log.warn("OpenAI API key not configured - using mock responses");
        }
        
        this.webClient = builder.build();
    }
    
    public String chatCompletion(String systemPrompt, String userMessage) {
        if (!hasApiKey) {
            log.error("OpenAI API key not configured - cannot generate response");
            throw new IllegalStateException(
                "OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.");
        }
        
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "gpt-4o-mini");
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 1000);
            
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.add(Map.of("role", "user", "content", userMessage));
            requestBody.put("messages", messages);
            
            log.info("Calling OpenAI API - Model: gpt-4o-mini, User message length: {} chars, System prompt length: {} chars", 
                     userMessage.length(), systemPrompt.length());
            
            long startTime = System.currentTimeMillis();
            String response = webClient.post()
                    .uri("/chat/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();
            long duration = System.currentTimeMillis() - startTime;
            
            JsonNode jsonNode = objectMapper.readTree(response);
            
            // Check for API errors
            if (jsonNode.has("error")) {
                JsonNode error = jsonNode.get("error");
                String errorMsg = error.has("message") ? error.get("message").asText() : "Unknown error";
                String errorType = error.has("type") ? error.get("type").asText() : "unknown";
                log.error("OpenAI API error [{}]: {} (took {}ms)", errorType, errorMsg, duration);
                
                throw new RuntimeException("OpenAI API error: " + errorMsg);
            }
            
            // Extract content from successful response
            if (jsonNode.has("choices") && jsonNode.get("choices").isArray() && jsonNode.get("choices").size() > 0) {
                JsonNode choice = jsonNode.get("choices").get(0);
                JsonNode usage = jsonNode.has("usage") ? jsonNode.get("usage") : null;
                String content = choice.get("message").get("content").asText();
                
                if (usage != null) {
                    int promptTokens = usage.has("prompt_tokens") ? usage.get("prompt_tokens").asInt() : 0;
                    int completionTokens = usage.has("completion_tokens") ? usage.get("completion_tokens").asInt() : 0;
                    int totalTokens = usage.has("total_tokens") ? usage.get("total_tokens").asInt() : 0;
                    log.info("OpenAI API response received - Length: {} chars, Tokens: {} (prompt: {}, completion: {}), Duration: {}ms", 
                            content.length(), totalTokens, promptTokens, completionTokens, duration);
                } else {
                    log.info("OpenAI API response received - Length: {} chars, Duration: {}ms", content.length(), duration);
                }
                return content;
            } else {
                log.error("Unexpected OpenAI API response structure: {}", response);
                throw new RuntimeException("Unexpected response structure from OpenAI API");
            }
            
        } catch (Exception e) {
            log.error("Error calling OpenAI API: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get response from OpenAI API: " + e.getMessage(), e);
        }
    }

}
