package com.BankingBuddy.client_service.service;

import com.BankingBuddy.client_service.exception.ClientAlreadyExistsException;
import com.BankingBuddy.client_service.exception.ClientNotFoundException;
import com.BankingBuddy.client_service.exception.ForbiddenException;
import com.BankingBuddy.client_service.exception.InvalidOperationException;
import com.BankingBuddy.client_service.model.dto.ClientDTO;
import com.BankingBuddy.client_service.model.dto.CreateClientRequest;
import com.BankingBuddy.client_service.model.dto.UpdateClientRequest;
import com.BankingBuddy.client_service.model.entity.Account;
import com.BankingBuddy.client_service.model.entity.Client;
import com.BankingBuddy.client_service.repository.AccountRepository;
import com.BankingBuddy.client_service.repository.ClientRepository;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.security.UserRole;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;
    private final AccountRepository accountRepository;
    private final SqsClient sqsClient;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Value("${audit.sqs.queue.url}")
    private String auditQueueUrl;
    
    @Value("${audit.source.service}")
    private String sourceService;
    
    @Value("${audit.log.retention.days:30}")
    private long logRetentionDays;

    /**
     * Publish audit log for client updates (decoupled - direct SQS)
     * Only logs fields that actually changed
     * Non-blocking: audit failures don't affect the response
     */
    private void publishUpdateAuditLog(String clientId, UserContext userContext, Map<String, Object> changes) {
        try {
            for (Map.Entry<String, Object> entry : changes.entrySet()) {
                String fieldName = entry.getKey();
                @SuppressWarnings("unchecked")
                Map<String, String> fieldChange = (Map<String, String>) entry.getValue();

                // Send UPDATE audit log directly to SQS (decoupled)
                sendAuditLogToSqs("UPDATE", clientId, userContext.getUserId(), 
                                fieldName, fieldChange.get("old"), fieldChange.get("new"));
            }

            log.info("Published {} audit logs for client {} update", changes.size(), clientId);
        } catch (Exception e) {
            // Don't fail the request if audit logging fails
            log.error("Failed to publish update audit logs for client {}: {}", clientId, e.getMessage(), e);
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

    /**
     * Create a new client profile
     * 
     * @param request     the client creation request
     * @param userContext the authenticated user context
     * @return the created client DTO
     */
    public ClientDTO createClient(CreateClientRequest request, UserContext userContext) {
        log.info("Creating client profile. Agent: {}", userContext.getUserId());

        // 1. Authorization check - ONLY AGENT can create clients (per spec)
        if (userContext.getRole() != UserRole.AGENT) {
            log.error("Unauthorized role attempting to create client: {}", userContext.getRole());
            throw new ForbiddenException("Only AGENT role can create client profiles");
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

        // 8. Send creation email (async, non-blocking)
        try {
            emailService.sendClientCreationEmail(savedClient);
            log.info("Triggered async client creation email send for client {}", clientId);
        } catch (Exception e) {
            log.error("Failed to trigger creation email for client {}: {}", clientId, e.getMessage(), e);
            // Continue - email failure should not stop creation
        }

        // 9. Convert to DTO and return
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

            // Send CREATE audit log directly to SQS
            sendAuditLogToSqs("CREATE", client.getClientId(), userContext.getUserId(), 
                            null, null, afterValue);

            log.info("Audit log published for client creation: {}", client.getClientId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize client data to JSON: {}", e.getMessage(), e);
        } catch (Exception e) {
            // Don't fail the request if audit logging fails
            log.error("Failed to publish audit log for client {}: {}", client.getClientId(), e.getMessage(), e);
        }
    }
    
    /**
     * Send audit log message directly to SQS (decoupled, no shared library)
     */
    private void sendAuditLogToSqs(String operation, String clientId, String agentId,
                                   String attributeName, String beforeValue, String afterValue) {
        try {
            // Build audit message as JSON
            Map<String, Object> auditMessage = new HashMap<>();
            auditMessage.put("log_id", UUID.randomUUID().toString());
            auditMessage.put("timestamp", Instant.now().toString());
            auditMessage.put("client_id", clientId);
            auditMessage.put("agent_id", agentId);
            auditMessage.put("crud_operation", operation);
            auditMessage.put("source_service", sourceService);
            
            // Calculate TTL (retention days from now)
            long ttl = Instant.now().plus(logRetentionDays, ChronoUnit.DAYS).getEpochSecond();
            auditMessage.put("ttl", ttl);
            
            // Add operation-specific fields
            if (attributeName != null) {
                auditMessage.put("attribute_name", attributeName);
            }
            if (beforeValue != null) {
                auditMessage.put("before_value", beforeValue);
            }
            if (afterValue != null) {
                auditMessage.put("after_value", afterValue);
            }
            
            // Convert to JSON string
            String messageBody = objectMapper.writeValueAsString(auditMessage);
            
            // Send to SQS
            SendMessageRequest request = SendMessageRequest.builder()
                    .queueUrl(auditQueueUrl)
                    .messageBody(messageBody)
                    .build();
            
            sqsClient.sendMessage(request);
            log.debug("Sent {} audit log to SQS for client {}", operation, clientId);
            
        } catch (Exception e) {
            // Non-blocking: log error but don't throw
            log.error("Failed to send audit log to SQS: {}", e.getMessage(), e);
        }
    }

    /**
     * Get all clients for the authenticated agent
     * Returns ClientDTO page for "Manage Profiles" page
     * No audit logs per specification (bulk reads not logged)
     * 
     * @param userContext the authenticated user context
     * @return list of client summaries
     */
    public Page<ClientDTO> getAllClientsForAgent(
            int page,
            int limit,
            UserContext userContext) {
        log.info("Retrieving all clients for agent: {}", userContext.getUserId());

        // Authorization: AGENT only (per spec)
        if (userContext.getRole() != UserRole.AGENT) {
            log.error("Unauthorized role attempting to list clients: {}", userContext.getRole());
            throw new ForbiddenException("Only AGENT role can list client profiles");
        }

        Pageable pageable = PageRequest.of(page, limit, Sort.by("createdAt").descending());
        Page<Client> clients = clientRepository.findByAgentIdAndDeletedFalse(userContext.getUserId(), pageable);
        log.info("Successfully fetched {} clients for agent {}", clients.getTotalElements(), userContext.getUserId());

        return clients.map(this::convertToDTO);
    }

    /**
     * Verify client identity
     * Marks client as verified and sends verification email via SES
     * Email sending is async and non-blocking - email failure does not affect
     * response
     * 
     * @param clientId    the client ID to verify
     * @param userContext the authenticated user context
     */
    public void verifyClient(String clientId, UserContext userContext) {
        log.info("Verifying client {}. Agent: {}", clientId, userContext.getUserId());
        
        // Authorization: AGENT only (per spec)
        if (userContext.getRole() != UserRole.AGENT) {
            log.error("Unauthorized role attempting to verify client: {}", userContext.getRole());
            throw new ForbiddenException("Only AGENT role can verify clients");
        }

        // 1. Fetch client from database
        Client client = clientRepository.findByClientIdAndDeletedFalse(clientId)
                .orElseThrow(() -> {
                    log.error("Client not found or deleted: {}", clientId);
                    return new ClientNotFoundException("Client not found or has been deleted");
                });

        // 2. Check authorization - agent must own the client
        if (!client.getAgentId().equals(userContext.getUserId())) {
            log.error("Agent {} attempted to verify client {} owned by agent {}",
                    userContext.getUserId(), clientId, client.getAgentId());
            throw new ClientNotFoundException("Client not found or has been deleted");
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
            sendAuditLogToSqs("UPDATE", clientId, userContext.getUserId(), 
                            "Verification Status", "Pending", "Verified");
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

    // Service to get client by client id
    public ClientDTO getClientById(String clientId, UserContext userContext) {
        log.info("Getting client by client id: {}", clientId);
        // Agents can only get the client that they created
        try {
            Client client = clientRepository.findByClientId(clientId)
                    .orElseThrow(() -> new ClientNotFoundException("Client with id" + clientId + "not found"));

            if (userContext.getRole() == UserRole.AGENT && !client.getAgentId().equals(userContext.getUserId())) {
                log.warn("Agent {} attempted to get client {} that is not created by them", userContext.getUserId(),
                        clientId);
                throw new ForbiddenException("You are not authorized to read this client profile");
            }

            log.info("Client {} retrieved successfully by {}", clientId, userContext.getUserId());
            
            // Publish READ audit log to SQS (per specification)
            try {
                sendAuditLogToSqs("READ", clientId, userContext.getUserId(), null, null, null);
                log.debug("Published READ audit log for client {}", clientId);
            } catch (Exception e) {
                log.error("Failed to publish READ audit log for client {}: {}", clientId, e.getMessage());
                // Non-blocking: continue with response
            }
            
            return convertToDTO(client);
        } catch (ClientNotFoundException e) {
            log.error("Client {} not found: {}", clientId, e.getMessage());
            throw e;
        } catch (ForbiddenException e) {
            log.error("Unauthorized access attempt to get client {} profile by agent {}", clientId,
                    userContext.getUserId());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error while getting client {} profile by agent {}", clientId, userContext.getUserId(),
                    e);
            throw new RuntimeException("An unexpected error occurred while getting client profile");
        }
    }

    // Service to update client profile by id
    public ClientDTO updateClientById(String clientId, UpdateClientRequest clientData, UserContext userContext) {
        log.info("Updating client profile: {} by agent {}", clientId, userContext.getUserId());
        // Only agent can update their own client profile
        if (userContext.getRole() != UserRole.AGENT) {
            log.warn("Unauthorized attempt to update client {} profile by agent {}", clientId, userContext.getUserId());
            throw new ForbiddenException("Only agents can update their own client profile");
        }

        Client client = clientRepository.findByClientIdAndDeletedFalse(clientId)
                .orElseThrow(() -> new ClientNotFoundException("Client with id" + clientId + "not found"));

        if (!client.getAgentId().equals(userContext.getUserId())) {
            log.warn("Agent {} attempted to update client {} that is not created by them", userContext.getUserId(),
                    clientId);
            throw new ForbiddenException("Only agents can update their own client profile");
        }

        // Track changes for audit logging
        Map<String, Object> changes = new HashMap<>();
        boolean hasChanges = false;
        // Go through each of the fields and update only the required fields while
        // logging them
        if (clientData.getFirstName() != null && !clientData.getFirstName().equals(client.getFirstName())) {
            changes.put("firstName", Map.of("old", client.getFirstName(), "new", clientData.getFirstName()));
            client.setFirstName(clientData.getFirstName());
            hasChanges = true;
        }

        if (clientData.getLastName() != null && !clientData.getLastName().equals(client.getLastName())) {
            changes.put("lastName", Map.of("old", client.getLastName(), "new", clientData.getLastName()));
            client.setLastName(clientData.getLastName());
            hasChanges = true;
        }

        if (clientData.getDateOfBirth() != null && !clientData.getDateOfBirth().equals(client.getDateOfBirth())) {
            changes.put("dateOfBirth",
                    Map.of("old", client.getDateOfBirth().toString(), "new", clientData.getDateOfBirth().toString()));
            client.setDateOfBirth(clientData.getDateOfBirth());
            hasChanges = true;
        }

        if (clientData.getGender() != null && !clientData.getGender().equals(client.getGender())) {
            changes.put("gender",
                    Map.of("old", client.getGender().getValue(), "new", clientData.getGender().getValue()));
            client.setGender(clientData.getGender());
            hasChanges = true;
        }

        if (clientData.getEmail() != null && !clientData.getEmail().equals(client.getEmail())) {
            // Check email uniqueness if changing email
            if (clientRepository.existsByEmailAndDeletedFalse(clientData.getEmail())) {
                log.error("Email already exists: {}", clientData.getEmail());
                throw new ClientAlreadyExistsException("A client with this email already exists");
            }
            changes.put("email", Map.of("old", client.getEmail(), "new", clientData.getEmail()));
            client.setEmail(clientData.getEmail());
            hasChanges = true;
        }

        if (clientData.getPhoneNumber() != null && !clientData.getPhoneNumber().equals(client.getPhoneNumber())) {
            // Check phone uniqueness if changing phone
            if (clientRepository.existsByPhoneNumberAndDeletedFalse(clientData.getPhoneNumber())) {
                log.error("Phone number already exists: {}", clientData.getPhoneNumber());
                throw new ClientAlreadyExistsException("A client with this phone number already exists");
            }
            changes.put("phoneNumber", Map.of("old", client.getPhoneNumber(), "new", clientData.getPhoneNumber()));
            client.setPhoneNumber(clientData.getPhoneNumber());
            hasChanges = true;
        }

        if (clientData.getAddress() != null && !clientData.getAddress().equals(client.getAddress())) {
            changes.put("address", Map.of("old", client.getAddress(), "new", clientData.getAddress()));
            client.setAddress(clientData.getAddress());
            hasChanges = true;
        }

        if (clientData.getCity() != null && !clientData.getCity().equals(client.getCity())) {
            changes.put("city", Map.of("old", client.getCity(), "new", clientData.getCity()));
            client.setCity(clientData.getCity());
            hasChanges = true;
        }

        if (clientData.getState() != null && !clientData.getState().equals(client.getState())) {
            changes.put("state", Map.of("old", client.getState(), "new", clientData.getState()));
            client.setState(clientData.getState());
            hasChanges = true;
        }

        if (clientData.getPostalCode() != null && !clientData.getPostalCode().equals(client.getPostalCode())) {
            changes.put("postalCode", Map.of("old", client.getPostalCode(), "new", clientData.getPostalCode()));
            client.setPostalCode(clientData.getPostalCode());
            hasChanges = true;
        }

        if (clientData.getCountry() != null && !clientData.getCountry().equals(client.getCountry())) {
            changes.put("country", Map.of("old", client.getCountry(), "new", clientData.getCountry()));
            client.setCountry(clientData.getCountry());
            hasChanges = true;
        }

        // Save the changes if there are any
        if (hasChanges) {
            Client savedClient = clientRepository.save(client);
            log.info("Client {} updated successfully with {} field changes", clientId, changes.size());

            // TODO: double check the logging logic
            // Publish audit logs for each changed field (non-blocking)
            publishUpdateAuditLog(clientId, userContext, changes);

            // Send update email (async, non-blocking)
            try {
                emailService.sendClientUpdateEmail(savedClient, changes);
                log.info("Triggered async client update email send for client {} with {} changes", 
                        clientId, changes.size());
            } catch (Exception e) {
                log.error("Failed to trigger update email for client {}: {}", clientId, e.getMessage(), e);
                // Continue - email failure should not stop update
            }

            return convertToDTO(savedClient);
        } else {
            log.info("No changes detected for client {}", clientId);
            return convertToDTO(client);
        }
    }

    // Service to soft delete client by id
    public void softDeleteClientById(String clientId, UserContext userContext) {
        log.info("Soft deleting client {} by agent {}", clientId, userContext.getUserId());
        // Agents only can soft delete their own client profile
        if (userContext.getRole() != UserRole.AGENT) {
            log.warn("Unauthorized attempt to soft delete client {} by agent {}", clientId, userContext.getUserId());
            throw new ForbiddenException("Only agents can soft delete their own client profiles");
        }

        Client client = clientRepository.findByClientIdAndDeletedFalse(clientId)
            .orElseThrow(() -> new ClientNotFoundException("Client with id" + clientId + "not found"));
        
        if (!client.getAgentId().equals(userContext.getUserId())) {
            log.warn("Agent {} attempted to soft delete client {} that is not created by them", userContext.getUserId(), clientId);
            throw new ForbiddenException("Only agents can soft delete their own client profiles");
        }

        // Per specification: Fetch ALL client's accounts and check if ALL have balance = 0
        List<Account> clientAccounts = accountRepository.findByClientIdAndDeletedFalse(clientId);
        
        if (!clientAccounts.isEmpty()) {
            // Check if ANY account has non-zero balance
            List<Account> accountsWithBalance = clientAccounts.stream()
                .filter(account -> account.getBalance().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());
            
            if (!accountsWithBalance.isEmpty()) {
                // Build error message with list of accounts
                String accountList = accountsWithBalance.stream()
                    .map(account -> String.format("Account %s (balance: %.2f %s)", 
                        account.getAccountId(), 
                        account.getBalance(), 
                        account.getCurrency()))
                    .collect(Collectors.joining(", "));
                
                log.error("Cannot delete client {}: {} account(s) have non-zero balance: {}", 
                    clientId, accountsWithBalance.size(), accountList);
                
                throw new InvalidOperationException(
                    String.format("Cannot delete client: %d account(s) have non-zero balance. " +
                        "Accounts with balance: %s", 
                        accountsWithBalance.size(), accountList));
            }
        }

        // Prepare before_value for audit log (per specification)
        String beforeValue = String.format("%s|%s|%s|%s",
                client.getFirstName(),
                client.getLastName(),
                client.getEmail(),
                client.getPhoneNumber());

        // Perform soft delete on client
        client.setDeleted(true);
        clientRepository.save(client);
        log.info("Client {} soft deleted successfully by agent {}", clientId, userContext.getUserId());

        // Cascade soft delete to ALL accounts (per specification)
        for (Account account : clientAccounts) {
            // Prepare before_value for account audit log
            String accountBeforeValue = String.format("%s|%s|%s|%.2f %s",
                account.getAccountId(),
                account.getAccountType().getValue(),
                account.getAccountStatus().getValue(),
                account.getBalance(),
                account.getCurrency());
            
            // Soft delete the account
            account.setDeleted(true);
            accountRepository.save(account);
            log.info("Account {} cascaded soft deleted with client {}", account.getAccountId(), clientId);
            
            // Publish DELETE audit log for each account to SQS (non-blocking)
            try {
                sendAuditLogToSqs("DELETE", clientId, userContext.getUserId(), 
                    "Account: " + account.getAccountId(), accountBeforeValue, null);
                log.debug("Published DELETE audit log for account {}", account.getAccountId());
            } catch (Exception e) {
                log.error("Failed to publish DELETE audit log for account {}: {}", 
                    account.getAccountId(), e.getMessage());
                // Non-blocking: audit failure should not affect deletion
            }
        }

        // Publish DELETE audit log for client to SQS (non-blocking)
        try {
            sendAuditLogToSqs("DELETE", clientId, userContext.getUserId(), null, beforeValue, null);
            log.debug("Published DELETE audit log for client {}", clientId);
        } catch (Exception e) {
            log.error("Failed to publish DELETE audit log for client {}: {}", clientId, e.getMessage());
            // Non-blocking: audit failure should not affect deletion
        }
        
        log.info("Client {} and {} associated account(s) soft deleted successfully", 
            clientId, clientAccounts.size());
        
        // Send deletion email (async, non-blocking)
        try {
            emailService.sendClientDeletionEmail(client, clientAccounts);
            log.info("Triggered async client deletion email send for client {} with {} accounts", 
                    clientId, clientAccounts.size());
        } catch (Exception e) {
            log.error("Failed to trigger deletion email for client {}: {}", clientId, e.getMessage(), e);
            // Continue - email failure should not stop deletion
        }
    }
}
