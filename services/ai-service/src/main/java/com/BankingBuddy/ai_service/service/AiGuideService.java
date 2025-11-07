package com.BankingBuddy.ai_service.service;

import com.BankingBuddy.ai_service.model.dto.GuideRequest;
import com.BankingBuddy.ai_service.model.dto.GuideResponse;
import com.BankingBuddy.ai_service.security.UserContext;
import com.BankingBuddy.ai_service.security.UserRole;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@Slf4j
public class AiGuideService {
    
    private final OpenAIService openAIService;
    private String documentationContent;
    
    public AiGuideService(OpenAIService openAIService) {
        this.openAIService = openAIService;
        loadDocumentation();
    }
    
    private void loadDocumentation() {
        try {
            // Load your documentation files
            ClassPathResource resource = new ClassPathResource("docs/guide.txt");
            if (resource.exists()) {
                documentationContent = StreamUtils.copyToString(
                    resource.getInputStream(), StandardCharsets.UTF_8);
                log.info("Loaded guide.txt successfully ({} characters)", documentationContent.length());
            } else {
                // Fallback to hardcoded guide content
                log.warn("guide.txt not found in classpath, using default content");
                documentationContent = createDefaultGuideContent();
            }
        } catch (IOException e) {
            log.error("Could not load documentation file: {}", e.getMessage());
            log.warn("Using default guide content");
            documentationContent = createDefaultGuideContent();
        }
    }
    
    private String createDefaultGuideContent() {
        return """
            Banking Buddy CRM System Guide
            
            RESET PASSWORD:
            - Navigate to User Management page
            - Click on your user profile
            - Select 'Reset Password' option
            - Check email for reset link
            
            VIEW TRANSACTION HISTORY:
            - Go to Transactions page
            - Filter by client ID, date range, or type
            - Click transaction for details
            
            MANAGE CLIENTS:
            - Navigate to Client Management
            - Create new clients with 'Create Client' button
            - Search by name, email, or status
            - View full details by clicking client
            
            CREATE ACCOUNT:
            - Go to Client Detail page
            - Click 'Create Account' button
            - Fill in account details (type, initial deposit)
            - Submit to create account
            
            VIEW ACCOUNTS:
            - Admins: Go to Account Management page
            - Agents: View accounts on Client Detail page
            
            SEARCH FUNCTIONALITY:
            - Use search bars on any management page
            - Filter by multiple criteria
            - Export results if needed
            """;
    }
    
    public GuideResponse answerQuestion(GuideRequest request, UserContext userContext) {
        log.info("AI Help Guide - Processing question: '{}' for user {} (role: {})", 
                 request.getQuestion(), userContext.getUserId(), userContext.getRole());
        
        // Filter documentation based on user role
        String filteredDoc = filterDocumentationByRole(documentationContent, userContext.getRole());
        
        String systemPrompt = """
            You are a helpful assistant for the Banking Buddy CRM system.
            Answer questions based on the following documentation FOR A %s USER:
            
            %s
            
            IMPORTANT GUIDELINES:
            - BE SPECIFIC: Answer exactly what was asked. If asked "how do I create an agent", only explain agent creation. If asked "how do I create an admin", only explain admin creation.
            - Only combine multiple topics if the question is broad (e.g., "how do I manage users" or "what can I create")
            - Provide clear, step-by-step instructions relevant to the %s role
            - Only provide information that this role has permission to access
            - If the question is about functionality not available to this role, politely explain why
            - If the question is not covered, suggest where the user might find more information
            - Be friendly and professional in your responses
            - Agents and admins are DIFFERENT: don't mix them unless explicitly asked about both
            """.formatted(userContext.getRole(), filteredDoc, userContext.getRole());
        
        String answer = openAIService.chatCompletion(systemPrompt, request.getQuestion());
        log.info("AI Help Guide - Generated answer (length: {} chars)", answer.length());
        
        // Extract related topics (simple keyword matching)
        List<String> relatedTopics = extractRelatedTopics(request.getQuestion(), userContext.getRole());
        
        return GuideResponse.builder()
                .answer(answer)
                .relatedTopics(relatedTopics)
                .source("Banking Buddy Documentation")
                .build();
    }
    
    private List<String> extractRelatedTopics(String question, UserRole role) {
        String lower = question.toLowerCase();
        List<String> topics = new ArrayList<>();
        
        if (lower.contains("password") || lower.contains("login")) {
            topics.add("Authentication");
        }
        if (lower.contains("transaction")) {
            topics.add("Transactions");
        }
        if (lower.contains("client") && role == UserRole.AGENT) {
            topics.add("Client Management");
        }
        if (lower.contains("account")) {
            topics.add("Account Management");
        }
        if (lower.contains("user") && (role == UserRole.ADMIN || role == UserRole.ROOT_ADMIN)) {
            topics.add("User Management");
        }
        if (lower.contains("agent") && (role == UserRole.ADMIN || role == UserRole.ROOT_ADMIN)) {
            topics.add("Agent Management");
        }
        if (lower.contains("admin") && role == UserRole.ROOT_ADMIN) {
            topics.add("Admin Management");
        }
        
        return topics.isEmpty() ? Arrays.asList("General Help") : topics;
    }
    
    // Filter documentation content based on user role
    private String filterDocumentationByRole(String fullDoc, UserRole role) {
        StringBuilder filtered = new StringBuilder();
        String[] lines = fullDoc.split("\n");
        
        boolean includeSection = true;
        String currentSection = "";
        
        for (String line : lines) {
            // Detect section headers
            if (line.trim().toUpperCase().equals(line.trim()) && line.trim().length() > 0 && 
                !line.contains("=") && !line.contains("-")) {
                currentSection = line.trim().toUpperCase();
                
                // Determine if this section should be included for this role
                includeSection = shouldIncludeSection(currentSection, role);
            }
            
            // Include line if we're in an included section
            if (includeSection) {
                filtered.append(line).append("\n");
            }
        }
        
        return filtered.toString();
    }
    
    // Determine if a documentation section should be included for a specific role
    private boolean shouldIncludeSection(String sectionName, UserRole role) {
        return switch (role) {
            case AGENT -> {
                // Agents should see: Client Management, Account Management (for their clients),
                // Transaction Management, Authentication, Dashboard, Common Tasks
                yield (!sectionName.contains("USER MANAGEMENT") && !sectionName.contains("ADMIN")) &&
                      (sectionName.contains("CLIENT") ||
                       sectionName.contains("ACCOUNT") ||
                       sectionName.contains("TRANSACTION") ||
                       sectionName.contains("AUTHENTICATION") ||
                       sectionName.contains("DASHBOARD") ||
                       sectionName.contains("COMMON") ||
                       sectionName.contains("ERROR") ||
                       sectionName.contains("BEST PRACTICES") ||
                       sectionName.contains("OVERVIEW") ||
                       sectionName.isEmpty());
            }
            case ADMIN -> {
                // Admins should see: User Management (agents only), Account Management (all),
                // Transaction Management, Agent queries, Dashboard, Common Tasks
                yield !sectionName.contains("CLIENT MANAGEMENT") &&
                      (sectionName.contains("USER MANAGEMENT") ||
                       sectionName.contains("ACCOUNT") ||
                       sectionName.contains("TRANSACTION") ||
                       sectionName.contains("AGENT") ||
                       sectionName.contains("AUTHENTICATION") ||
                       sectionName.contains("DASHBOARD") ||
                       sectionName.contains("COMMON") ||
                       sectionName.contains("ERROR") ||
                       sectionName.contains("BEST PRACTICES") ||
                       sectionName.contains("OVERVIEW") ||
                       sectionName.contains("AUTHORIZATION") ||
                       sectionName.isEmpty());
            }
            case ROOT_ADMIN -> {
                // Root admins can see everything
                yield true;
            }
        };
    }
}
