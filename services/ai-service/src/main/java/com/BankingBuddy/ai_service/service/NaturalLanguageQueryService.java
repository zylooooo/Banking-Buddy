package com.BankingBuddy.ai_service.service;

import com.BankingBuddy.ai_service.model.dto.QueryRequest;
import com.BankingBuddy.ai_service.model.dto.QueryResponse;
import com.BankingBuddy.ai_service.security.UserContext;
import com.BankingBuddy.ai_service.security.UserRole;
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
public class NaturalLanguageQueryService {
    
    private final OpenAIService openAIService;
    private final WebClient clientServiceClient;
    private final WebClient transactionServiceClient;
    private final WebClient userServiceClient;
    private final ObjectMapper objectMapper;
    
    public NaturalLanguageQueryService(
            OpenAIService openAIService,
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${SERVICES_CLIENT_SERVICE_URL:http://client-service:8081}") String clientServiceUrl,
            @Value("${SERVICES_TRANSACTION_SERVICE_URL:http://transaction-service:8082}") String transactionServiceUrl,
            @Value("${SERVICES_USER_SERVICE_URL:http://user-service:8080}") String userServiceUrl) {

        log.info("Service URLs configured:");
        log.info("  Client Service URL: {}", clientServiceUrl);
        log.info("  Transaction Service URL: {}", transactionServiceUrl);
        log.info("  User Service URL: {}", userServiceUrl);

        this.openAIService = openAIService;
        this.objectMapper = objectMapper;
        this.clientServiceClient = webClientBuilder
                .baseUrl(clientServiceUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.transactionServiceClient = webClientBuilder
                .baseUrl(transactionServiceUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.userServiceClient = webClientBuilder
                .baseUrl(userServiceUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
    
    public QueryResponse processQuery(QueryRequest request, String authToken, UserContext userContext) {
        String query = request.getQuery();
        log.info("Processing natural language query: '{}' for user {} (role: {})", 
                 query, userContext.getUserId(), userContext.getRole());
        
        try {
            // Use AI to determine query intent and extract parameters
            String intentPrompt = """
                Analyze this CRM query and determine:
                1. Query type: "client", "transaction", "account", "agent", "admin", "users", "general", or "unknown"
                2. Parameters: client name/ID, agent name/ID, admin name/ID, date range, transaction type, etc.
                3. Scope: "personal" (I/my/mine), "broad" (all/every), or "none"
                
                IMPORTANT RULES:
                - If query mentions "transaction", "transactions", "show transactions", "list transactions", 
                  "get transactions", "all transactions", "my transactions", set type to "transaction"
                - If query mentions "transactions from [name]" or "transactions for [name]", 
                  set type to "transaction" and extract clientName from the query
                - If query asks to "show", "find", "list", "get", or "display" clients, set type to "client"
                
                ACCOUNT QUERY RULES (CRITICAL):
                - If query mentions "accounts" with personal scope like "I manage", "my accounts", "I have", 
                  "accounts for my clients", "accounts under me", set type to "account" and scope to "personal"
                - If query mentions "accounts" WITHOUT personal scope like "all accounts", "show accounts", 
                  "list accounts", set type to "account" and scope to "broad"
                - SPECIAL: If an ADMIN says "accounts I manage", they likely mean AGENT user accounts, 
                  so set type to "agent" (not "account")
                
                - If query mentions BOTH "agents" AND "admins", set type to "users" (combined query)
                - If query mentions "admin" or "admins" or "administrator" (and NOT also agents), set type to "admin"
                - If query mentions "agent" or "agents" (and NOT admin), set type to "agent"
                - If query mentions "users" or asks about all staff, set type to "agent" (broader query)
                - If query asks "what can you", "what do you", "how can I", "help me", or is a general question,
                  set type to "general"
                - Extract client names from phrases like "from paul", "for john", "client named X"
                - If transaction query mentions a client name, extract it to clientName parameter
                - Examples of transaction queries: "show me all transactions", "list my transactions", "transactions for client X"
                - Examples of account queries with personal scope: "accounts I manage", "my accounts", "accounts for my clients"
                - Examples of account queries with broad scope: "all accounts", "show accounts", "list accounts"
                - Examples of agent queries: "show me all agents", "list agents"
                - Examples of admin queries: "show me all admins", "list administrators"
                - Example of combined query: "show agents and admins" → type should be "users"
                
                Query: """ + query + """
                
                Respond with ONLY valid JSON (no markdown, no explanations):
                {
                    "type": "client|transaction|account|agent|admin|users|general|unknown",
                    "scope": "personal|broad|none",
                    "parameters": {
                        "clientId": "...",
                        "clientName": "...",
                        "agentId": "...",
                        "agentName": "...",
                        "adminName": "...",
                        "dateFrom": "...",
                        "dateTo": "...",
                        "transactionType": "..."
                    }
                }
                """;
            
            log.info("Natural Language Query - Calling OpenAI to parse query intent...");
            String intentJson = openAIService.chatCompletion(
                "You are a query parser. Return ONLY valid JSON, no markdown code blocks, no explanations.", 
                intentPrompt
            );
            
            log.info("Natural Language Query - Received intent JSON from OpenAI (length: {} chars)", intentJson.length());
            
            intentJson = cleanJsonResponse(intentJson);
            
            try {
                JsonNode intent = objectMapper.readTree(intentJson);
                String queryType = intent.get("type").asText("unknown");
                log.info("Parsed query type: {} from query: {} (user role: {})", 
                         queryType, query, userContext.getRole());
                
                return switch (queryType) {
                    case "client" -> handleClientQuery(intent, authToken, userContext);
                    case "transaction" -> handleTransactionQuery(intent, authToken, userContext);
                    case "account" -> handleAccountQuery(intent, query, authToken, userContext);
                    case "agent" -> handleAgentQuery(intent, authToken, userContext);
                    case "admin" -> handleAdminQuery(intent, authToken, userContext);
                    case "users" -> handleCombinedUsersQuery(intent, authToken, userContext);
                    case "general" -> handleGeneralQuery(request.getQuery(), userContext);
                    default -> {
                        log.warn("AI parsed query as 'unknown', attempting keyword-based fallback");
                        yield tryFallbackParsing(request.getQuery(), authToken, userContext);
                    }
                };
            } catch (Exception e) {
                log.error("Error parsing query intent: {}. Raw response: {}", e.getMessage(), intentJson, e);
                return tryFallbackParsing(request.getQuery(), authToken, userContext);
            }
        } catch (RuntimeException e) {
            // This might be from OpenAI API failure
            log.error("Failed to process query due to OpenAI API error: {}", e.getMessage(), e);
            throw e; // Re-throw so controller can handle it
        } catch (Exception e) {
            log.error("Unexpected error processing query: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process query: " + e.getMessage(), e);
        }
    }
    
    private QueryResponse handleClientQuery(JsonNode intent, String authToken, UserContext userContext) {
        try {
            // AGENTS: Can only query their own clients (restricted by client-service API)
            // ADMINS: Cannot directly query clients (client-service blocks admin access to GET /api/clients)
            // ROOT_ADMIN: Same as ADMIN
            
            if (userContext.getRole() != UserRole.AGENT) {
                String suggestion = switch (userContext.getRole()) {
                    case ADMIN -> "As an admin, you can manage agents. Try 'show agents I manage'.";
                    case ROOT_ADMIN -> "As a root admin, you can view accounts for oversight. Try 'show all accounts'.";
                    case AGENT -> ""; // Unreachable
                };
                
                return QueryResponse.builder()
                        .naturalLanguageResponse("You don't have permission to query client information. " +
                               "Client management is handled by agents. " + suggestion)
                        .queryType("client")
                        .results(Collections.emptyList())
                        .build();
            }
            
            JsonNode params = intent.get("parameters");
            String clientName = params.has("clientName") && !params.get("clientName").isNull() 
                ? params.get("clientName").asText() : null;
            // Handle case where AI returns string "null"
            if ("null".equalsIgnoreCase(clientName)) {
                clientName = null;
            }
            
            // Call client service API (automatically filters to agent's clients)
            String response = clientServiceClient.get()
                    .uri("/api/clients?page=0&limit=100")
                    .header("Authorization", "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            JsonNode clientsResponse = objectMapper.readTree(response);
            List<Map<String, Object>> results = new ArrayList<>();
            
            if (clientsResponse.has("data") && clientsResponse.get("data").has("content")) {
                JsonNode clients = clientsResponse.get("data").get("content");
                if (clients.isArray()) {
                    for (JsonNode client : clients) {
                        String firstName = client.has("firstName") ? 
                            client.get("firstName").asText("") : "";
                        String lastName = client.has("lastName") ? 
                            client.get("lastName").asText("") : "";
                        String fullName = (firstName + " " + lastName).trim();
                        
                        if (clientName == null || clientName.isEmpty() || 
                            fullName.toLowerCase().contains(clientName.toLowerCase()) ||
                            firstName.toLowerCase().contains(clientName.toLowerCase()) ||
                            lastName.toLowerCase().contains(clientName.toLowerCase())) {
                            Map<String, Object> clientMap = new HashMap<>();
                            clientMap.put("clientId", client.get("clientId").asText());
                            clientMap.put("name", fullName);
                            clientMap.put("email", client.has("email") ? client.get("email").asText() : "");
                            clientMap.put("status", client.has("verified") && client.get("verified").asBoolean() ? "Verified" : "Unverified");
                            results.add(clientMap);
                        }
                    }
                }
            }
            
            log.info("Natural Language Query - Calling OpenAI to summarize client results...");
            String nlResponse = openAIService.chatCompletion(
                "You are a CRM assistant. Summarize client search results naturally.",
                "Found " + results.size() + " clients matching the query. " + 
                (clientName != null ? "Searching for clients named: " + clientName + ". " : "") +
                "Provide a natural language summary."
            );
            log.info("Natural Language Query - Generated client summary (length: {} chars)", nlResponse.length());
            
            return QueryResponse.builder()
                    .naturalLanguageResponse(nlResponse)
                    .queryType("client")
                    .results(results)
                    .sqlQuery("GET /api/clients")
                    .build();
                    
        } catch (Exception e) {
            log.error("Error querying clients: {}", e.getMessage());
            return QueryResponse.builder()
                    .naturalLanguageResponse("I encountered an error while searching for clients. " +
                           "Please make sure you're querying clients you created.")
                    .queryType("client")
                    .results(Collections.emptyList())
                    .build();
        }
    }
    
    private QueryResponse handleTransactionQuery(JsonNode intent, String authToken, UserContext userContext) {
        try {
            // Only AGENTS can query transactions
            if (userContext.getRole() != UserRole.AGENT) {
                String roleGuidance = switch (userContext.getRole()) {
                    case ADMIN -> "As an admin, you can manage agents. Try 'show agents I manage'.";
                    case ROOT_ADMIN -> "As a root admin, you can manage users and view accounts for oversight.";
                    case AGENT -> ""; // Unreachable
                };
                
                return QueryResponse.builder()
                        .naturalLanguageResponse("You don't have permission to view transaction data. " +
                               "Only agents can view transactions for their clients. " +
                               roleGuidance)
                        .queryType("transaction")
                        .results(Collections.emptyList())
                        .build();
            }
            
            JsonNode params = intent.get("parameters");
            String clientName = params.has("clientName") && !params.get("clientName").isNull() 
                ? params.get("clientName").asText() : null;
            String clientId = params.has("clientId") && !params.get("clientId").isNull() 
                ? params.get("clientId").asText() : null;
            // Handle case where AI returns string "null"
            if ("null".equalsIgnoreCase(clientName)) {
                clientName = null;
            }
            if ("null".equalsIgnoreCase(clientId)) {
                clientId = null;
            }
            
            // AGENTS: Can only query transactions for their own clients
            log.info("Agent {} querying transactions - will filter to own clients", userContext.getUserId());
            List<String> allowedClientIds = getClientIdsForAgent(authToken, userContext);
            
            // If no allowed clients, return empty
            if (allowedClientIds.isEmpty()) {
                return QueryResponse.builder()
                        .naturalLanguageResponse("You don't have any clients. Transactions will appear once you create clients.")
                        .queryType("transaction")
                        .results(Collections.emptyList())
                        .build();
            }
            
            // Filter by client name if provided
            if (clientName != null) {
                List<String> matchingClientIds = findClientIdsByName(clientName, allowedClientIds, authToken, userContext);
                if (matchingClientIds.isEmpty()) {
                    return QueryResponse.builder()
                            .naturalLanguageResponse("No clients found matching '" + clientName + "' in your accessible clients.")
                            .queryType("transaction")
                            .results(Collections.emptyList())
                            .build();
                }
                allowedClientIds = matchingClientIds;
            }
            
            // If specific clientId provided, verify it's in allowed list
            if (clientId != null && !allowedClientIds.contains(clientId)) {
                return QueryResponse.builder()
                        .naturalLanguageResponse("You don't have permission to view transactions for that client.")
                        .queryType("transaction")
                        .results(Collections.emptyList())
                        .build();
            }
            
            // Build transaction query
            String uri = "/api/transactions/search?";
            if (clientId != null) {
                uri += "clientIds=" + clientId + "&";
            } else if (!allowedClientIds.isEmpty()) {
                uri += "clientIds=" + String.join(",", allowedClientIds) + "&";
            }
            
            // Add other filters from intent
            if (params.has("dateFrom")) {
                uri += "startDate=" + params.get("dateFrom").asText() + "&";
            }
            if (params.has("dateTo")) {
                uri += "endDate=" + params.get("dateTo").asText() + "&";
            }
            if (params.has("transactionType")) {
                uri += "transaction=" + params.get("transactionType").asText() + "&";
            }
            
            uri += "limit=10&page=0";
            
            String response = transactionServiceClient.get()
                    .uri(uri)
                    .header("Authorization", "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            JsonNode transactionsResponse = objectMapper.readTree(response);
            List<Map<String, Object>> results = new ArrayList<>();
            
            if (transactionsResponse.has("data") && transactionsResponse.get("data").has("content")) {
                JsonNode transactions = transactionsResponse.get("data").get("content");
                if (transactions.isArray()) {
                    for (JsonNode tx : transactions) {
                        Map<String, Object> txMap = new HashMap<>();
                        txMap.put("transactionId", tx.has("id") ? tx.get("id").asText() : "");
                        txMap.put("amount", tx.has("amount") ? tx.get("amount").asText() : "");
                        txMap.put("type", tx.has("transaction") ? tx.get("transaction").asText() : "");
                        txMap.put("date", tx.has("date") ? tx.get("date").asText() : "");
                        txMap.put("clientId", tx.has("clientId") ? tx.get("clientId").asText() : "");
                        results.add(txMap);
                    }
                }
            }
            
            log.info("Natural Language Query - Calling OpenAI to summarize transaction results...");
            String nlResponse = openAIService.chatCompletion(
                "You are a CRM assistant. Summarize transaction search results naturally.",
                "Found " + results.size() + " transactions. " +
                (clientName != null ? "Filtered for client: " + clientName + ". " : "") +
                "Provide a natural language summary."
            );
            log.info("Natural Language Query - Generated transaction summary (length: {} chars)", nlResponse.length());
            
            return QueryResponse.builder()
                    .naturalLanguageResponse(nlResponse)
                    .queryType("transaction")
                    .results(results)
                    .sqlQuery("GET /api/transactions/search")
                    .build();
                    
        } catch (Exception e) {
            log.error("Error querying transactions: {}", e.getMessage(), e);
            return QueryResponse.builder()
                    .naturalLanguageResponse("I encountered an error while searching transactions. " +
                           "Please check your permissions and try again.")
                    .queryType("transaction")
                    .results(Collections.emptyList())
                    .build();
        }
    }
    
    private QueryResponse handleAccountQuery(JsonNode intent, String originalQuery, String authToken, UserContext userContext) {
        try {
            // "Accounts" is a general term that means different things for different roles:
            // - For AGENTS: "accounts" = clients they manage
            // - For ADMINS: "accounts" = agents they manage
            // - For ROOT_ADMIN: "accounts" = system-wide overview (all users)
            
            // Check scope: personal vs broad
            String scope = intent.has("scope") ? intent.get("scope").asText("broad") : "broad";
            log.info("Account query - Initial scope from AI: '{}', Original query: '{}'", scope, originalQuery);
            
            // Fallback: If scope not detected but query has personal keywords, treat as personal
            if ("broad".equals(scope) && originalQuery != null) {
                String queryLower = originalQuery.toLowerCase();
                log.info("Checking for personal keywords in query: '{}'", queryLower);
                if (queryLower.contains("my") || queryLower.contains("mine") || 
                    queryLower.contains("i manage") || queryLower.contains("i have") ||
                    queryLower.contains("for my") || queryLower.contains("under me")) {
                    scope = "personal";
                    log.info("Fallback scope detection: Changed from broad to personal based on query keywords");
                } else {
                    log.info("No personal keywords found, keeping scope as broad");
                }
            }
            
            log.info("Final scope decision: '{}' for role: {}", scope, userContext.getRole());
            
            // Broad scope (e.g., "show all accounts") - only ROOT_ADMIN can do system-wide queries
            if ("broad".equals(scope)) {
                if (userContext.getRole() != UserRole.ROOT_ADMIN) {
                    String suggestion = switch (userContext.getRole()) {
                        case AGENT -> "As an agent, you can query your clients. Try 'show my clients' or 'show accounts I manage'.";
                        case ADMIN -> "As an admin, you can query agents you manage. Try 'show my agents' or 'show agents I manage'.";
                        case ROOT_ADMIN -> ""; // Unreachable
                    };
                    
                    return QueryResponse.builder()
                            .naturalLanguageResponse("You cannot query all accounts in the system. " +
                                   "Only root administrators can view system-wide data. " + suggestion)
                            .queryType("account")
                            .results(Collections.emptyList())
                            .build();
                }
                
                // ROOT_ADMIN with broad scope - show all users (agents and admins)
                log.info("ROOT_ADMIN querying all accounts (system-wide) - routing to combined users query");
                return handleCombinedUsersQuery(intent, authToken, userContext);
            }
            
            // Personal scope (e.g., "show my accounts", "accounts I manage") - route based on role
            return switch (userContext.getRole()) {
                case AGENT -> {
                    log.info("AGENT with personal scope 'accounts' - routing to client query");
                    yield handleClientQuery(intent, authToken, userContext);
                }
                case ADMIN -> {
                    log.info("ADMIN with personal scope 'accounts' - routing to agent query");
                    yield handleAgentQuery(intent, authToken, userContext);
                }
                case ROOT_ADMIN -> {
                    log.info("ROOT_ADMIN with personal scope 'accounts' - routing to combined users query");
                    yield handleCombinedUsersQuery(intent, authToken, userContext);
                }
            };
                    
        } catch (Exception e) {
            log.error("Error routing account query: {}", e.getMessage());
            return QueryResponse.builder()
                    .naturalLanguageResponse("I encountered an error while processing your query.")
                    .queryType("account")
                    .results(Collections.emptyList())
                    .build();
        }
    }
    
    private QueryResponse handleAgentQuery(JsonNode intent, String authToken, UserContext userContext) {
        try {
            // Only ADMINS and ROOT_ADMINS can query agents
            if (userContext.getRole() != UserRole.ADMIN && userContext.getRole() != UserRole.ROOT_ADMIN) {
                String suggestion = switch (userContext.getRole()) {
                    case AGENT -> "As an agent, you can query your clients, accounts, and transactions. Try 'show me all my clients' or 'show me all accounts'.";
                    case ADMIN, ROOT_ADMIN -> ""; // Unreachable, but required for exhaustive switch
                };
                
                return QueryResponse.builder()
                        .naturalLanguageResponse("You don't have permission to query agent information. " + suggestion)
                        .queryType("agent")
                        .results(Collections.emptyList())
                        .build();
            }
            
            // Extract agent name if provided
            JsonNode params = intent.get("parameters");
            String agentName = params.has("agentName") && !params.get("agentName").isNull() 
                ? params.get("agentName").asText() : null;
            // Handle case where AI returns string "null"
            if ("null".equalsIgnoreCase(agentName)) {
                agentName = null;
            }
            
            String response = userServiceClient.get()
                    .uri("/api/users")
                    .header("Authorization", "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            JsonNode usersResponse = objectMapper.readTree(response);
            List<Map<String, Object>> results = new ArrayList<>();
            
            if (usersResponse.has("data")) {
                JsonNode users = usersResponse.get("data");
                if (users.isArray()) {
                    for (JsonNode user : users) {
                        String role = user.has("role") ? user.get("role").asText("") : "";
                        
                        // Only include agents (both ADMIN and ROOT_ADMIN can see agents)
                        if ("agent".equalsIgnoreCase(role)) {
                            String firstName = user.has("firstName") ? user.get("firstName").asText("") : "";
                            String lastName = user.has("lastName") ? user.get("lastName").asText("") : "";
                            String fullName = (firstName + " " + lastName).trim();
                            
                            // Filter by name if provided
                            if (agentName == null || agentName.isEmpty() ||
                                fullName.toLowerCase().contains(agentName.toLowerCase()) ||
                                firstName.toLowerCase().contains(agentName.toLowerCase()) ||
                                lastName.toLowerCase().contains(agentName.toLowerCase())) {
                                
                                Map<String, Object> userMap = new HashMap<>();
                                userMap.put("userId", user.has("id") ? user.get("id").asText() : "");
                                userMap.put("name", fullName);
                                userMap.put("email", user.has("email") ? user.get("email").asText() : "");
                                userMap.put("role", role);
                                userMap.put("status", user.has("status") ? user.get("status").asText() : "");
                                results.add(userMap);
                            }
                        }
                    }
                }
            }
            
            // Check if name filter returned no results
            if (agentName != null && !agentName.isEmpty() && results.isEmpty()) {
                String nlResponse = "No agents found matching '" + agentName + "'.";
                return QueryResponse.builder()
                        .naturalLanguageResponse(nlResponse)
                        .queryType("agent")
                        .results(Collections.emptyList())
                        .sqlQuery("GET /api/users")
                        .build();
            }
            
            log.info("Natural Language Query - Calling OpenAI to summarize agent results...");
            String roleContext = userContext.getRole() == UserRole.ROOT_ADMIN ? 
                "in the system" : "that you manage";
            String nlResponse = openAIService.chatCompletion(
                "You are a CRM assistant. Summarize agent search results naturally.",
                "Found " + results.size() + " agent(s) " + roleContext + ". " +
                (agentName != null ? "Searching for agents named: " + agentName + ". " : "") +
                "Provide a natural language summary."
            );
            log.info("Natural Language Query - Generated agent summary (length: {} chars)", nlResponse.length());
            
            return QueryResponse.builder()
                    .naturalLanguageResponse(nlResponse)
                    .queryType("agent")
                    .results(results)
                    .sqlQuery("GET /api/users")
                    .build();
                    
        } catch (Exception e) {
            log.error("Error querying agents: {}", e.getMessage());
            return QueryResponse.builder()
                    .naturalLanguageResponse("I encountered an error while searching for agents.")
                    .queryType("agent")
                    .results(Collections.emptyList())
                    .build();
        }
    }
    
    private QueryResponse handleAdminQuery(JsonNode intent, String authToken, UserContext userContext) {
        try {
            // Only ROOT_ADMINS can query admins
            if (userContext.getRole() != UserRole.ROOT_ADMIN) {
                String suggestion = switch (userContext.getRole()) {
                    case AGENT -> "As an agent, you can query your clients, accounts, and transactions. Try 'show me all my clients'.";
                    case ADMIN -> "As an admin, you can view agents you manage. Try 'show agents I manage'.";
                    case ROOT_ADMIN -> ""; // Unreachable, but required for exhaustive switch
                };
                
                return QueryResponse.builder()
                        .naturalLanguageResponse("You don't have permission to query admin information. " +
                               "Only root administrators can view admins. " + suggestion)
                        .queryType("admin")
                        .results(Collections.emptyList())
                        .build();
            }
            
            // Extract admin name if provided
            JsonNode params = intent.get("parameters");
            String adminName = params.has("adminName") && !params.get("adminName").isNull() 
                ? params.get("adminName").asText() : null;
            // Handle case where AI returns string "null"
            if ("null".equalsIgnoreCase(adminName)) {
                adminName = null;
            }
            
            String response = userServiceClient.get()
                    .uri("/api/users")
                    .header("Authorization", "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            JsonNode usersResponse = objectMapper.readTree(response);
            List<Map<String, Object>> results = new ArrayList<>();
            
            if (usersResponse.has("data")) {
                JsonNode users = usersResponse.get("data");
                if (users.isArray()) {
                    for (JsonNode user : users) {
                        String role = user.has("role") ? user.get("role").asText("") : "";
                        
                        // Only include admins (not root admins, not agents)
                        if ("admin".equalsIgnoreCase(role)) {
                            String firstName = user.has("firstName") ? user.get("firstName").asText("") : "";
                            String lastName = user.has("lastName") ? user.get("lastName").asText("") : "";
                            String fullName = (firstName + " " + lastName).trim();
                            
                            // Filter by name if provided
                            if (adminName == null || adminName.isEmpty() ||
                                fullName.toLowerCase().contains(adminName.toLowerCase()) ||
                                firstName.toLowerCase().contains(adminName.toLowerCase()) ||
                                lastName.toLowerCase().contains(adminName.toLowerCase())) {
                                
                                Map<String, Object> userMap = new HashMap<>();
                                userMap.put("userId", user.has("id") ? user.get("id").asText() : "");
                                userMap.put("name", fullName);
                                userMap.put("email", user.has("email") ? user.get("email").asText() : "");
                                userMap.put("role", role);
                                userMap.put("status", user.has("status") ? user.get("status").asText() : "");
                                results.add(userMap);
                            }
                        }
                    }
                }
            }
            
            // Check if name filter returned no results
            if (adminName != null && !adminName.isEmpty() && results.isEmpty()) {
                String nlResponse = "No administrators found matching '" + adminName + "'.";
                return QueryResponse.builder()
                        .naturalLanguageResponse(nlResponse)
                        .queryType("admin")
                        .results(Collections.emptyList())
                        .sqlQuery("GET /api/users")
                        .build();
            }
            
            log.info("Natural Language Query - Calling OpenAI to summarize admin results...");
            String nlResponse = openAIService.chatCompletion(
                "You are a CRM assistant. Summarize administrator search results naturally.",
                "Found " + results.size() + " administrator(s) in the system. " +
                (adminName != null ? "Searching for administrators named: " + adminName + ". " : "") +
                "Provide a natural language summary."
            );
            log.info("Natural Language Query - Generated admin summary (length: {} chars)", nlResponse.length());
            
            return QueryResponse.builder()
                    .naturalLanguageResponse(nlResponse)
                    .queryType("admin")
                    .results(results)
                    .sqlQuery("GET /api/users")
                    .build();
                    
        } catch (Exception e) {
            log.error("Error querying admins: {}", e.getMessage());
            return QueryResponse.builder()
                    .naturalLanguageResponse("I encountered an error while searching for administrators.")
                    .queryType("admin")
                    .results(Collections.emptyList())
                    .build();
        }
    }
    
    private QueryResponse handleCombinedUsersQuery(JsonNode intent, String authToken, UserContext userContext) {
        try {
            // Only ROOT_ADMIN can query both agents and admins
            if (userContext.getRole() != UserRole.ROOT_ADMIN) {
                String suggestion = switch (userContext.getRole()) {
                    case AGENT -> "As an agent, you can query your clients and transactions. Try 'show me all my clients'.";
                    case ADMIN -> "As an admin, you can query agents you manage. Try 'show agents I manage'.";
                    case ROOT_ADMIN -> ""; // Unreachable
                };
                
                return QueryResponse.builder()
                        .naturalLanguageResponse("You don't have permission to query user information. " + suggestion)
                        .queryType("users")
                        .results(Collections.emptyList())
                        .build();
            }
            
            // Fetch all users
            String response = userServiceClient.get()
                    .uri("/api/users")
                    .header("Authorization", "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            JsonNode usersResponse = objectMapper.readTree(response);
            List<Map<String, Object>> results = new ArrayList<>();
            
            if (usersResponse.has("data") && usersResponse.get("data").isArray()) {
                JsonNode users = usersResponse.get("data");
                for (JsonNode user : users) {
                    String role = user.has("role") ? user.get("role").asText() : "";
                    
                    // Include both AGENT and ADMIN roles
                    if ("agent".equalsIgnoreCase(role) || "admin".equalsIgnoreCase(role)) {
                        Map<String, Object> userMap = new HashMap<>();
                        userMap.put("userId", user.has("userId") ? user.get("userId").asText() : "");
                        userMap.put("name", (user.has("firstName") ? user.get("firstName").asText() : "") + " " +
                                          (user.has("lastName") ? user.get("lastName").asText() : ""));
                        userMap.put("email", user.has("email") ? user.get("email").asText() : "");
                        userMap.put("role", role.toUpperCase());
                        userMap.put("enabled", user.has("enabled") ? user.get("enabled").asBoolean() : false);
                        results.add(userMap);
                    }
                }
            }
            
            long agentCount = results.stream().filter(u -> "AGENT".equals(u.get("role"))).count();
            long adminCount = results.stream().filter(u -> "ADMIN".equals(u.get("role"))).count();
            
            String nlResponse = String.format("Found %d user(s): %d agent(s) and %d admin(s) in the system.",
                    results.size(), agentCount, adminCount);
            
            return QueryResponse.builder()
                    .naturalLanguageResponse(nlResponse)
                    .queryType("users")
                    .results(results)
                    .sqlQuery("GET /api/users")
                    .build();
                    
        } catch (Exception e) {
            log.error("Error querying combined users: {}", e.getMessage());
            return QueryResponse.builder()
                    .naturalLanguageResponse("I encountered an error while searching for users.")
                    .queryType("users")
                    .results(Collections.emptyList())
                    .build();
        }
    }
    
    // Helper Methods
    
    // Fetch all client IDs for an agent used by transaction queries to filter by client
    private List<String> getClientIdsForAgent(String authToken, UserContext userContext) {
        try {
            // Call client-service to get agent's clients filtered by agent ID
            String response = clientServiceClient.get()
                    .uri("/api/clients?page=0&limit=100")
                    .header("Authorization", "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            JsonNode clientsResponse = objectMapper.readTree(response);
            List<String> clientIds = new ArrayList<>();
            
            // Extract client IDs from response
            if (clientsResponse.has("data") && clientsResponse.get("data").has("content")) {
                JsonNode clients = clientsResponse.get("data").get("content");
                if (clients.isArray()) {
                    for (JsonNode client : clients) {
                        if (client.has("clientId")) {
                            clientIds.add(client.get("clientId").asText());
                        }
                    }
                }
            }
            
            return clientIds;
        } catch (Exception e) {
            log.error("Error getting client IDs: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
    
    private List<String> findClientIdsByName(String clientName, List<String> allowedClientIds, 
                                             String authToken, UserContext userContext) {
        try {
            log.info("Searching for clients matching name: '{}' among {} allowed clients", clientName, allowedClientIds.size());
            
            // Fetch all clients for the agent
            String response = clientServiceClient.get()
                    .uri("/api/clients?page=0&limit=100")
                    .header("Authorization", "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            JsonNode clientsResponse = objectMapper.readTree(response);
            List<String> matchingClientIds = new ArrayList<>();
            String searchName = clientName.toLowerCase().trim();
            
            if (clientsResponse.has("data") && clientsResponse.get("data").has("content")) {
                JsonNode clients = clientsResponse.get("data").get("content");
                if (clients.isArray()) {
                    for (JsonNode client : clients) {
                        String clientId = client.has("clientId") ? client.get("clientId").asText() : null;
                        
                        // Only consider clients in the allowed list
                        if (clientId != null && allowedClientIds.contains(clientId)) {
                            String firstName = client.has("firstName") ? client.get("firstName").asText("").toLowerCase() : "";
                            String lastName = client.has("lastName") ? client.get("lastName").asText("").toLowerCase() : "";
                            String fullName = (firstName + " " + lastName).trim();
                            
                            // Match against first name, last name, or full name
                            if (firstName.contains(searchName) || 
                                lastName.contains(searchName) || 
                                fullName.contains(searchName) ||
                                searchName.contains(firstName) ||
                                searchName.contains(lastName)) {
                                matchingClientIds.add(clientId);
                                log.info("Found matching client: {} {} (ID: {})", firstName, lastName, clientId);
                            }
                        }
                    }
                }
            }
            
            log.info("Name search '{}' returned {} matching clients", clientName, matchingClientIds.size());
            return matchingClientIds;
            
        } catch (Exception e) {
            log.error("Error searching for clients by name '{}': {}", clientName, e.getMessage());
            // If search fails, return all allowed IDs to let transaction service handle filtering
            return allowedClientIds;
        }
    }
    
    private String cleanJsonResponse(String json) {
        // Remove markdown code blocks if present
        json = json.trim();
        if (json.startsWith("```json")) {
            json = json.substring(7);
        }
        if (json.startsWith("```")) {
            json = json.substring(3);
        }
        if (json.endsWith("```")) {
            json = json.substring(0, json.length() - 3);
        }
        return json.trim();
    }
    
    private QueryResponse handleGeneralQuery(String query, UserContext userContext) {
        log.info("Handling general/conversational query: '{}'", query);
        
        try {
            String availableFeatures = getRoleSpecificFeatures(userContext.getRole());
            
            // More conversational system prompt - acts like a helpful AI assistant
            String systemPrompt = """
                You are a helpful AI assistant for the Banking Buddy CRM system. 
                You can help users with general questions, provide information, and assist with CRM-related queries.
                
                IMPORTANT: Format your responses using proper Markdown syntax:
                - Use blank lines before numbered lists (1., 2., 3., etc.)
                - Use blank lines before bullet lists (- or *)
                - Use **text** for bold text
                - Use ## for section headers
                - Ensure each list item appears on a new line
                
                User Role: %s
                
                When users ask about CRM features (clients, transactions, accounts, agents, admins), you can:
                - Explain what they can query based on their role
                - Provide examples of queries they can make
                - Guide them on how to use the system
                
                IMPORTANT: If a user asks for MULTIPLE entity types in one query (e.g., "show me all agents and admins"):
                - Explain that they need to ask separate questions for each entity type
                - Provide example queries for each type they asked about
                - Be clear that the system processes one query type at a time
                
                For general questions (not CRM-related), provide helpful, conversational answers.
                Be friendly, professional, and helpful. If a question is outside your knowledge,
                politely explain that you're focused on helping with the Banking Buddy CRM system.
                
                %s
                """.formatted(userContext.getRole(), availableFeatures);
            
            String response = openAIService.chatCompletion(systemPrompt, query);
            response = normalizeMarkdownFormatting(response);
            
            return QueryResponse.builder()
                    .naturalLanguageResponse(response)
                    .queryType("general")
                    .results(Collections.emptyList())
                    .build();
                    
        } catch (Exception e) {
            log.error("Error handling general query: {}", e.getMessage());
            // Fallback to AI-based unknown handler instead of hardcoded message
            return handleUnknownQuery(query, userContext);
        }
    }
    
    private QueryResponse tryFallbackParsing(String query, String authToken, UserContext userContext) {
        // Enhanced keyword-based fallback
        String lowerQuery = query.toLowerCase();
        
        // Check for general conversational queries
        if (lowerQuery.contains("what can") || lowerQuery.contains("what do") || 
            lowerQuery.contains("how can") || lowerQuery.contains("help") ||
            lowerQuery.contains("show me what") || lowerQuery.contains("what options")) {
            log.info("Fallback: Detected general question, handling as conversational query");
            return handleGeneralQuery(query, userContext);
        }
        
        // Check if query asks for BOTH agents and admins
        if ((lowerQuery.contains("agent") && lowerQuery.contains("admin")) ||
            (lowerQuery.contains("agents") && lowerQuery.contains("admins"))) {
            log.info("Fallback: Detected query for both agents and admins, routing to combined users query");
            return handleCombinedUsersQuery(
                objectMapper.createObjectNode().put("type", "users")
                    .set("parameters", objectMapper.createObjectNode()),
                authToken, userContext);
        }
        
        // Check for account queries
        if (lowerQuery.contains("account")) {
            log.info("Fallback: Detected 'account' keyword, attempting account query");
            return handleAccountQuery(
                objectMapper.createObjectNode().put("type", "account")
                    .set("parameters", objectMapper.createObjectNode()),
                query,
                authToken, userContext);
        }
        
        // Check for transaction queries (multiple variations)
        if (lowerQuery.contains("transaction")) {
            log.info("Fallback: Detected 'transaction' keyword, attempting transaction query");
            return handleTransactionQuery(
                objectMapper.createObjectNode().put("type", "transaction")
                    .set("parameters", objectMapper.createObjectNode()),
                authToken, userContext);
        } 
        
        // Check for agent queries
        if (lowerQuery.contains("agent")) {
            log.info("Fallback: Detected 'agent' keyword, attempting agent query");
            return handleAgentQuery(
                objectMapper.createObjectNode().put("type", "agent")
                    .set("parameters", objectMapper.createObjectNode()),
                authToken, userContext);
        }
        
        // Check for admin queries
        if (lowerQuery.contains("admin")) {
            log.info("Fallback: Detected 'admin' keyword, attempting admin query");
            return handleAdminQuery(
                objectMapper.createObjectNode().put("type", "admin")
                    .set("parameters", objectMapper.createObjectNode()),
                authToken, userContext);
        }
        
        // Check for client queries
        if (lowerQuery.contains("client")) {
            if (userContext.getRole() == UserRole.AGENT) {
                log.info("Fallback: Detected 'client' keyword, attempting client query");
                return handleClientQuery(
                    objectMapper.createObjectNode().put("type", "client")
                        .set("parameters", objectMapper.createObjectNode()),
                    authToken, userContext);
            }
        }
        
        // If no keywords match, try using AI for conversational response
        log.info("Fallback: No keywords matched, attempting conversational AI response");
        return handleGeneralQuery(query, userContext);
    }
    
    private QueryResponse handleUnknownQuery(String query, UserContext userContext) {
        log.info("Handling unknown query with AI: '{}'", query);
        
        try {
            String availableFeatures = getRoleSpecificFeatures(userContext.getRole());
            
            String systemPrompt = """
                You are a helpful AI assistant for the Banking Buddy CRM system.
                The user asked something that doesn't match a specific CRM query type.
                
                IMPORTANT: Format your responses using proper Markdown syntax:
                - Use blank lines before numbered lists (1., 2., 3., etc.)
                - Use blank lines before bullet lists (- or *)
                - Use **text** for bold text
                - Use ## for section headers
                - Ensure each list item appears on a new line
                
                User Role: %s
                
                %s
                
                Provide a friendly, helpful response that:
                1. Acknowledges their question
                2. Explains what types of queries THEY can make based on their role (be specific)
                3. Offers to help them refine their query if needed
                
                IMPORTANT: Only suggest queries that their role is allowed to make. 
                Do NOT suggest features they cannot access.
                
                Be conversational and helpful, not robotic.
                """.formatted(userContext.getRole(), availableFeatures);
            
            String response = openAIService.chatCompletion(systemPrompt, 
                "The user asked: \"" + query + "\". " +
                "This doesn't match a specific CRM query. Provide a helpful response.");
            response = normalizeMarkdownFormatting(response);
            
            return QueryResponse.builder()
                    .naturalLanguageResponse(response)
                    .queryType("unknown")
                    .results(Collections.emptyList())
                    .build();
        } catch (Exception e) {
            log.error("Error in AI-based unknown query handler: {}", e.getMessage());
            
            String fallbackMessage = switch (userContext.getRole()) {
                case AGENT -> "I'm not sure how to handle that query. As an agent, you can ask about your clients, accounts, and transactions. You can also ask 'what can I do?' for help.";
                case ADMIN -> "I'm not sure how to handle that query. As an admin, you can ask about agents you manage and view all accounts. You can also ask 'what can I do?' for help.";
                case ROOT_ADMIN -> "I'm not sure how to handle that query. As a root admin, you can ask about admins, agents, and view all accounts. You can also ask 'what can I do?' for help.";
            };
            
            return QueryResponse.builder()
                    .naturalLanguageResponse(fallbackMessage)
                    .queryType("unknown")
                    .results(Collections.emptyList())
                    .build();
        }
    }

    private String normalizeMarkdownFormatting(String text) {
        if (text == null) return "";
        
        // Handle colons before numbered lists
        text = text.replaceAll("([^\\n]):\\s+(\\d+\\.)", "$1:\n\n$2");
        text = text.replaceAll("([^\\n:])\\s+(\\d+\\.)", "$1\n\n$2");
        text = text.replaceAll("(\\d+\\.\\s+[^\\n]+?)\\s+(\\d+\\.)", "$1\n\n$2");
        
        // Handle nested bullets
        text = text.replaceAll("(\\d+\\.\\s+[^\\n]+?):\\s+([-*]\\s+)", "$1:\n  $2");
        text = text.replaceAll("([^\\n]):\\s+([-*]\\s+)", "$1:\n\n$2");
        text = text.replaceAll("([^\\n:])\\s+([-*]\\s+)", "$1\n\n$2");
        text = text.replaceAll("([-*]\\s+[^\\n]+?)\\s+([-*]\\s)", "$1\n\n$2");
        
        // Clean up excessive newlines
        text = text.replaceAll("\\n{3,}", "\n\n");
        
        return text.trim();
    }
    
    /**
     * Returns role-specific features and capabilities for the AI assistant prompt.
     * This ensures users only see queries relevant to their role in the system.
     */
    private String getRoleSpecificFeatures(UserRole role) {
        return switch (role) {
            case AGENT -> """
                Available CRM features for AGENTS:
                - Query clients: "show me all my clients", "find client named John"
                  (You can only see clients you created)
                - Query transactions: "show me all transactions", "transactions from last month", "transactions for client John"
                  (You can only see transactions for your own clients)
                - Query accounts (with personal scope): "show accounts I manage", "my accounts", "accounts for my clients"
                  (You can only see accounts belonging to your clients)
                - Create and manage client profiles through the Client Management page
                - Create accounts for your clients through the Client Detail page (via UI)
                
                What you CANNOT do:
                - Query ALL accounts in the system (only personal: "accounts I manage")
                - Query or manage other agents' clients
                - Query agent or admin information
                - Manage users (admins only)
                - View transactions for clients you don't manage
                """;
            case ADMIN -> """
                Available CRM features for ADMINS:
                - Query agents: "show agents I manage", "find agent named John"
                  (You can ONLY see agents you created and manage, not all agents in the system)
                - Manage users through the User Management page (create/edit/disable agents you created)
                
                What you CANNOT do:
                - Query account data (only ROOT_ADMIN can view accounts)
                - Query or create client profiles directly (that's the agent's responsibility)
                - View transaction data (transactions are operational data accessible only to agents)
                - Query or manage other admins or root administrators
                - See agents created by other admins
                
                Note: Your role is focused on managing the agents you created.
                """;
            case ROOT_ADMIN -> """
                Available CRM features for ROOT ADMINISTRATORS:
                - Query admins: "show me all admins", "find admin named Sarah"
                  (You have full visibility of all administrators in the system)
                - Query agents: "show me all agents" in the entire system
                  (You can see all agents, including those created by different admins)
                - Query accounts: "show me all accounts" across all clients
                  (You have full system visibility of all accounts for oversight)
                - Manage all users through the User Management page (create/edit/disable admins and agents)
                - Full system administration and oversight
                
                IMPORTANT: Agents and admins are separate:
                - "show me all agents" returns ONLY agents
                - "show me all admins" returns ONLY admins
                - If you want both, ask two separate questions
                
                What you CANNOT do:
                - Query or create client profiles directly (that's the agent's responsibility)
                - View transaction data (transactions are operational data accessible only to agents)
                - Modify other ROOT_ADMIN accounts (security restriction)
                
                Note: You are at the top of the hierarchy: Root Admins → Admins → Agents → Clients
                Your role focuses on user management and account oversight, not operational transaction data.
                """;
        };
    }
}
