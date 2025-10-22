package com.BankingBuddy.client_service.controller;

import com.BankingBuddy.client_service.model.dto.ApiResponse;
import com.BankingBuddy.client_service.model.dto.ClientDTO;
import com.BankingBuddy.client_service.model.dto.CreateClientRequest;
import com.BankingBuddy.client_service.model.dto.UpdateClientRequest;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.service.ClientService;

import jakarta.servlet.http.HttpServletRequest;
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

    /**
     * Get client by client id
     * Returns detailed client information including all associated accounts
     * This is used when the agent clicks into a client from the "Manage Profiles" page
     * 
     * @param clientId the client ID to get
     * @param httpRequest the HTTP request containing the user context
     * @return ResponseEntity with the client profile
     */
    @GetMapping("/{clientId}")
    public ResponseEntity<ApiResponse<ClientDTO>> getClientById(
        @PathVariable String clientId,
        HttpServletRequest httpRequest
    ) {
        UserContext userContext = (UserContext) httpRequest.getAttribute("userContext");
        ClientDTO clientDTO = clientService.getClientById(clientId, userContext);

        return ResponseEntity.ok(ApiResponse.success(clientDTO, "Client profile retrieved successfully"));
    }

    /**
     * Update client information
     * PUT with PATCH semantics - accepts partial updates
     * Only updates fields that are provided and different from current values
     * 
     * @param clientId the client ID to update
     * @param clientData the update request with optional fields
     * @param userContext the authenticated user context (AGENT only, own clients)
     * @return ResponseEntity with updated client data
     */
    @PutMapping("/{clientId}")
    public ResponseEntity<ApiResponse<ClientDTO>> updateClientById(
        @PathVariable String clientId,
        @Valid @RequestBody UpdateClientRequest clientData,
        @RequestAttribute("userContext") UserContext userContext
    ) {
        log.info("PUT /api/clients/{} called by agent: {}", clientId, userContext.getUserId());

        ClientDTO client = clientService.updateClientById(clientId, clientData, userContext);

        return ResponseEntity.ok(ApiResponse.success(client, "Client profile updated successfully"));
    }

    /**
     * Soft delete client profile
     * Cascades to all associated accounts (only if all accounts have balance = 0)
     * 
     * @param clientId the client ID to delete
     * @param userContext the authenticated user context (AGENT only, own clients)
     * @return ResponseEntity with success message
     */
    @DeleteMapping("/{clientId}")
    public ResponseEntity<ApiResponse<Void>> softDeleteClientById(
        @PathVariable String clientId,
        @RequestAttribute("userContext") UserContext userContext
    ) {
        log.info("DELETE /api/clients/{} called by agent: {}", clientId, userContext.getUserId());

        clientService.softDeleteClientById(clientId, userContext);

        return ResponseEntity.ok(ApiResponse.success(null, "Client profile soft deleted successfully"));
    }
}
