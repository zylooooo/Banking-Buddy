package com.BankingBuddy.client_service.service;

import com.BankingBuddy.client_service.exception.ClientAlreadyExistsException;
import com.BankingBuddy.client_service.exception.ForbiddenException;
import com.BankingBuddy.client_service.exception.InvalidOperationException;
import com.BankingBuddy.client_service.model.dto.ClientDTO;
import com.BankingBuddy.client_service.model.dto.CreateClientRequest;
import com.BankingBuddy.client_service.model.entity.Client;
import com.BankingBuddy.client_service.repository.ClientRepository;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.security.UserRole;
import com.bankingbuddy.audit.AuditPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClientService {

    private final ClientRepository clientRepository;
    private final AuditPublisher auditPublisher;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Create a new client profile
     * 
     * @param request the client creation request
     * @param userContext the authenticated user context
     * @return the created client DTO
     */
    @Transactional
    public ClientDTO createClient(CreateClientRequest request, UserContext userContext) {
        log.info("Creating client profile. Agent: {}", userContext.getUserId());

        // 1. Authorization check - only AGENT and ADMIN can create clients
        if (userContext.getRole() != UserRole.AGENT && userContext.getRole() != UserRole.ADMIN) {
            log.error("Unauthorized role attempting to create client: {}", userContext.getRole());
            throw new ForbiddenException("Only AGENT or ADMIN roles can create client profiles");
        }

        // 2. Check email uniqueness
        if (clientRepository.existsByEmailAndDeletedFalse(request.getEmail())) {
            log.error("Email already exists: {}", request.getEmail());
            throw new ClientAlreadyExistsException("A client with this email already exists");
        }

        // 4. Check phone number uniqueness
        if (clientRepository.existsByPhoneNumberAndDeletedFalse(request.getPhoneNumber())) {
            log.error("Phone number already exists: {}", request.getPhoneNumber());
            throw new ClientAlreadyExistsException("A client with this phone number already exists");
        }

        // 5. Generate client ID
        String clientId = "CLT-" + UUID.randomUUID().toString();

        // 6. Build and save client entity
        Client client = Client.builder()
                .clientId(clientId)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .country(request.getCountry())
                .agentId(userContext.getUserId())
                .deleted(false)
                .build();

        Client savedClient = clientRepository.save(client);
        log.info("Client created successfully with ID: {}", clientId);

        // 7. Publish audit log (non-blocking, fire-and-forget)
        publishAuditLog(savedClient, userContext);

        // 8. Convert to DTO and return
        return convertToDTO(savedClient);
    }

    /**
     * Publish audit log for client creation
     */
    private void publishAuditLog(Client client, UserContext userContext) {
        try {
            Map<String, Object> clientData = new HashMap<>();
            clientData.put("clientId", client.getClientId());
            clientData.put("firstName", client.getFirstName());
            clientData.put("lastName", client.getLastName());
            clientData.put("email", client.getEmail());
            clientData.put("phoneNumber", client.getPhoneNumber());
            clientData.put("gender", client.getGender().getValue());
            clientData.put("agentId", client.getAgentId());

            // Convert client data to JSON string
            String afterValue = objectMapper.writeValueAsString(clientData);

            auditPublisher.logCreate(
                    client.getClientId(),
                    userContext.getUserId(),
                    afterValue
            );

            log.info("Audit log published for client creation: {}", client.getClientId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize client data to JSON: {}", e.getMessage(), e);
        } catch (Exception e) {
            // Don't fail the request if audit logging fails
            log.error("Failed to publish audit log for client {}: {}", client.getClientId(), e.getMessage(), e);
        }
    }

    /**
     * Get all clients for the authenticated agent
     * Returns ClientSummaryDTO list for "Manage Profiles" page
     * No audit logs per specification (bulk reads not logged)
     * 
     * @param userContext the authenticated user context
     * @return list of client summaries
     */
    public java.util.List<com.BankingBuddy.client_service.model.dto.ClientSummaryDTO> getAllClientsForAgent(UserContext userContext) {
        log.info("Retrieving all clients for agent: {}", userContext.getUserId());
        
        java.util.List<Client> clients = clientRepository.findByAgentIdAndDeletedFalse(userContext.getUserId());
        
        return clients.stream()
                .map(client -> com.BankingBuddy.client_service.model.dto.ClientSummaryDTO.builder()
                        .clientId(client.getClientId())
                        .fullName(client.getFirstName() + " " + client.getLastName())
                        .verified(client.getVerified())
                        .email(client.getEmail())
                        .phoneNumber(client.getPhoneNumber())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Verify client identity
     * Marks client as verified and sends verification email via SES
     * Email sending is async and non-blocking - email failure does not affect response
     * 
     * @param clientId the client ID to verify
     * @param userContext the authenticated user context
     */
    @Transactional
    public void verifyClient(String clientId, UserContext userContext) {
        log.info("Verifying client {}. Agent: {}", clientId, userContext.getUserId());
        
        // 1. Fetch client from database
        Client client = clientRepository.findByClientIdAndDeletedFalse(clientId)
                .orElseThrow(() -> {
                    log.error("Client not found or deleted: {}", clientId);
                    return new com.BankingBuddy.client_service.exception.ClientNotFoundException(
                            "Client not found or has been deleted");
                });
        
        // 2. Check authorization - agent must own the client
        if (!client.getAgentId().equals(userContext.getUserId())) {
            log.error("Agent {} attempted to verify client {} owned by agent {}",
                     userContext.getUserId(), clientId, client.getAgentId());
            throw new com.BankingBuddy.client_service.exception.ClientNotFoundException(
                    "Client not found or has been deleted");
        }
        
        // 3. Check if already verified (idempotent)
        if (Boolean.TRUE.equals(client.getVerified())) {
            log.info("Client {} is already verified. Returning success (idempotent)", clientId);
            return; // Idempotent - return success without further action
        }
        
        // 4. Update verified = true and save to database
        client.setVerified(true);
        clientRepository.save(client);
        log.info("Client {} marked as verified in database", clientId);
        
        // 5. Publish audit log to SQS (non-blocking)
        try {
            auditPublisher.logUpdate(
                    clientId,
                    userContext.getUserId(),
                    "Verification Status",
                    "Pending",
                    "Verified"
            );
            log.info("Published verification audit log to SQS for client {}", clientId);
        } catch (Exception e) {
            log.error("Failed to publish verification audit log for client {}: {}", 
                     clientId, e.getMessage(), e);
            // Continue - audit failure should not stop verification
        }
        
        // 6. Send verification email via SES (async, non-blocking)
        // Email failure does not affect the response (handled in EmailService)
        try {
            emailService.sendVerificationEmail(client);
            log.info("Triggered async verification email send for client {}", clientId);
        } catch (Exception e) {
            log.error("Failed to trigger verification email for client {}: {}", 
                     clientId, e.getMessage(), e);
            // Continue - email failure should not stop verification
        }
    }

    /**
     * Convert Client entity to ClientDTO
     */
    private ClientDTO convertToDTO(Client client) {
        return ClientDTO.builder()
                .clientId(client.getClientId())
                .firstName(client.getFirstName())
                .lastName(client.getLastName())
                .dateOfBirth(client.getDateOfBirth())
                .gender(client.getGender())
                .email(client.getEmail())
                .phoneNumber(client.getPhoneNumber())
                .address(client.getAddress())
                .city(client.getCity())
                .state(client.getState())
                .postalCode(client.getPostalCode())
                .country(client.getCountry())
                .agentId(client.getAgentId())
                .verified(client.getVerified())
                .deleted(client.getDeleted())
                .createdAt(client.getCreatedAt())
                .updatedAt(client.getUpdatedAt())
                .build();
    }
}
