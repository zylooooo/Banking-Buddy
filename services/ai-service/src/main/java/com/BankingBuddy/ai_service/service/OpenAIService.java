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
import org.springframework.lang.NonNull;

@Service
@Slf4j
public class OpenAIService {
    
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final boolean hasApiKey;
    private final String model;
    private final double temperature;
    private final int maxTokens;
    private final int timeoutSeconds;
    
    public OpenAIService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${openai.api.key}") String apiKey,
            @Value("${openai.api.url}") @NonNull String apiUrl,
            @Value("${openai.model}") @NonNull String model,
            @Value("${openai.temperature}") double temperature,
            @Value("${openai.max-tokens}") int maxTokens,
            @Value("${openai.timeout-seconds}") int timeoutSeconds) {
        this.objectMapper = objectMapper;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        this.timeoutSeconds = timeoutSeconds;
        
        // Clean and validate API key
        this.apiKey = (apiKey != null) ? apiKey.trim() : "";
        this.hasApiKey = !this.apiKey.isEmpty() && !this.apiKey.isBlank();
        
        // Build WebClient
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
            requestBody.put("model", model);
            requestBody.put("temperature", temperature);
            requestBody.put("max_tokens", maxTokens);
            
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.add(Map.of("role", "user", "content", userMessage));
            requestBody.put("messages", messages);
            
            log.info("Calling OpenAI API - Model: {}, User message length: {} chars, System prompt length: {} chars", 
                     model, userMessage.length(), systemPrompt.length());
            
            long startTime = System.currentTimeMillis();
            String response = webClient.post()
                    .uri("/chat/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
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
