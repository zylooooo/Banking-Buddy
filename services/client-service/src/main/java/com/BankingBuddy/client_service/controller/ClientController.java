package com.BankingBuddy.client_service.controller;

import com.BankingBuddy.client_service.model.dto.ApiResponse;
import com.BankingBuddy.client_service.model.dto.ClientDTO;
import com.BankingBuddy.client_service.model.dto.CreateClientRequest;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
@Slf4j
public class ClientController {

    private final ClientService clientService;

    /**
     * Create a new client profile
     * 
     * @param request the client creation request with validation
     * @param userContext the authenticated user context (injected by interceptor)
     * @return ResponseEntity with created client data
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ClientDTO>> createClient(
            @Valid @RequestBody CreateClientRequest request,
            @RequestAttribute("userContext") UserContext userContext) {

        log.info("POST /api/clients called by user: {}", userContext.getUserId());

        ClientDTO clientDTO = clientService.createClient(request, userContext);

        ApiResponse<ClientDTO> response = ApiResponse.success(
                clientDTO,
                "Client profile created successfully"
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all clients for the authenticated agent
     * Returns simplified client summaries for "Manage Profiles" page
     * 
     * @param userContext the authenticated user context (AGENT only)
     * @return ResponseEntity with list of client summaries
     */
    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<com.BankingBuddy.client_service.model.dto.ClientSummaryDTO>>> getAllClients(
            @RequestAttribute("userContext") UserContext userContext) {

        log.info("GET /api/clients called by user: {} (role: {})", 
                userContext.getUserId(), userContext.getRole());

        // Authorization check - only AGENT can access
        if (userContext.getRole() != com.BankingBuddy.client_service.security.UserRole.AGENT) {
            log.error("Unauthorized role attempting to get clients: {}", userContext.getRole());
            throw new com.BankingBuddy.client_service.exception.ForbiddenException(
                    "Only AGENT role can access client list");
        }

        java.util.List<com.BankingBuddy.client_service.model.dto.ClientSummaryDTO> clients = 
                clientService.getAllClientsForAgent(userContext);

        ApiResponse<java.util.List<com.BankingBuddy.client_service.model.dto.ClientSummaryDTO>> response = 
                ApiResponse.success(clients, "Clients retrieved successfully");

        return ResponseEntity.ok(response);
    }

    /**
     * Verify client identity
     * Marks client as verified and sends verification email via SES
     * 
     * @param clientId the client ID to verify
     * @param userContext the authenticated user context (AGENT only, own clients)
     * @return ResponseEntity with success message
     */
    @PostMapping("/{clientId}/verify")
    public ResponseEntity<ApiResponse<Void>> verifyClient(
            @PathVariable String clientId,
            @RequestAttribute("userContext") UserContext userContext) {

        log.info("POST /api/clients/{}/verify called by agent: {}", clientId, userContext.getUserId());

        clientService.verifyClient(clientId, userContext);

        ApiResponse<Void> response = ApiResponse.success(null, "Client verified successfully");

        return ResponseEntity.ok(response);
    }
}
