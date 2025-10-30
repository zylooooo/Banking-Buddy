package com.BankingBuddy.client_service.service;

import com.BankingBuddy.client_service.exception.AccountNotFoundException;
import com.BankingBuddy.client_service.exception.ClientNotFoundException;
import com.BankingBuddy.client_service.exception.ForbiddenException;
import com.BankingBuddy.client_service.exception.InvalidOperationException;
import com.BankingBuddy.client_service.model.dto.AccountDTO;
import com.BankingBuddy.client_service.model.dto.AccountWithClientDTO;
import com.BankingBuddy.client_service.model.dto.CreateAccountRequest;
import com.BankingBuddy.client_service.model.entity.Account;
import com.BankingBuddy.client_service.model.entity.Client;
import com.BankingBuddy.client_service.repository.AccountRepository;
import com.BankingBuddy.client_service.repository.ClientRepository;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.security.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for account operations
 * Handles account management with authorization and audit logging
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AccountService {

    private final AccountRepository accountRepository;
    private final ClientRepository clientRepository;
    private final SqsClient sqsClient;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Value("${audit.sqs.queue-url}")
    private String auditQueueUrl;
    
    @Value("${audit.source-service}")
    private String sourceService;
    
    @Value("${audit.log-retention-days:30}")
    private long logRetentionDays;

    /**
     * Get all accounts with client information (Admin/Root Admin only)
     * Uses JPA JOIN FETCH to get client data in single query
     * Returns AccountWithClientDTO with client fullName and agentId
     * No audit logs per specification (bulk reads not logged)
     * 
     * @param userContext the authenticated user context
     * @return list of accounts with client information
     */
    public List<AccountWithClientDTO> getAllAccounts(UserContext userContext) {
        log.info("Retrieving all accounts with client information. User: {}, Role: {}", 
                userContext.getUserId(), userContext.getRole());
        
        // Authorization check - only ADMIN and ROOT_ADMIN can access (per spec)
        if (userContext.getRole() != UserRole.ADMIN && 
            userContext.getRole() != UserRole.ROOT_ADMIN) {
            log.error("Unauthorized role attempting to get all accounts: {}", userContext.getRole());
            throw new ForbiddenException("Only ADMIN or ROOT_ADMIN roles can access all accounts");
        }
        
        // Use custom query that fetches accounts with client info via JOIN
        List<Account> accounts = accountRepository.findAllAccountsWithClientInfo();
        
        return accounts.stream()
                .map(this::convertToAccountWithClientDTO)
                .collect(Collectors.toList());
    }

    /**
     * Convert Account entity (with client) to AccountWithClientDTO
     * Computes clientFullName from firstName + lastName
     */
    private AccountWithClientDTO convertToAccountWithClientDTO(Account account) {
        return AccountWithClientDTO.builder()
                .accountId(account.getAccountId())
                .accountType(account.getAccountType())
                .accountStatus(account.getAccountStatus())
                .openingDate(account.getOpeningDate())
                .initialDeposit(account.getInitialDeposit())
                .balance(account.getBalance())
                .currency(account.getCurrency())
                .branchId(account.getBranchId())
                .deleted(account.getDeleted())
                .clientId(account.getClientId())
                .clientFullName(account.getClient().getFirstName() + " " + account.getClient().getLastName())
                .agentId(account.getClient().getAgentId())
                .build();
    }

    /**
     * Convert Account entity to AccountDTO
     */
    private AccountDTO convertToAccountDTO(Account account) {
        return AccountDTO.builder()
                .accountId(account.getAccountId())
                .clientId(account.getClientId())
                .accountType(account.getAccountType())
                .accountStatus(account.getAccountStatus())
                .openingDate(account.getOpeningDate())
                .initialDeposit(account.getInitialDeposit())
                .balance(account.getBalance())
                .currency(account.getCurrency())
                .branchId(account.getBranchId())
                .deleted(account.getDeleted())
                .createdAt(account.getCreatedAt())
                .updatedAt(account.getUpdatedAt())
                .build();
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
     * Create a new account for a client (AGENT only, own clients)
     * Per specification:
     * - Agent must own the client
     * - Client must not be deleted
     * - Balance is set to initialDeposit
     * - Opening date is set to current date
     * - Sends CREATE audit log to SQS
     * 
     * @param request the account creation request
     * @param userContext the authenticated user context (AGENT only)
     * @return the created account DTO
     */
    public AccountDTO createAccount(CreateAccountRequest request, UserContext userContext) {
        log.info("Creating account for client {}. Agent: {}", request.getClientId(), userContext.getUserId());

        // 1. Authorization check - ONLY AGENT can create accounts (per spec)
        if (userContext.getRole() != UserRole.AGENT) {
            log.error("Unauthorized role attempting to create account: {}", userContext.getRole());
            throw new ForbiddenException("Only AGENT role can create accounts");
        }

        // 2. Fetch client and verify it belongs to agent
        Client client = clientRepository.findByClientIdAndDeletedFalse(request.getClientId())
                .orElseThrow(() -> {
                    log.error("Client not found or deleted: {}", request.getClientId());
                    return new ClientNotFoundException("Client not found or has been deleted");
                });

        // 3. Verify agent owns the client
        if (!client.getAgentId().equals(userContext.getUserId())) {
            log.error("Agent {} attempted to create account for client {} owned by agent {}",
                    userContext.getUserId(), request.getClientId(), client.getAgentId());
            throw new ForbiddenException("You can only create accounts for your own clients");
        }

        // 4. Generate account ID
        String accountId = "ACC-" + UUID.randomUUID().toString();

        // 5. Build and save account entity
        Account account = Account.builder()
                .accountId(accountId)
                .clientId(request.getClientId())
                .accountType(request.getAccountType())
                .accountStatus(request.getAccountStatus())
                .openingDate(LocalDate.now())
                .initialDeposit(request.getInitialDeposit())
                .balance(request.getInitialDeposit()) // Balance = initial deposit
                .currency(request.getCurrency())
                .branchId(request.getBranchId())
                .deleted(false)
                .build();

        Account savedAccount = accountRepository.save(account);
        log.info("Account created successfully with ID: {}", accountId);

        // 6. Publish CREATE audit log to SQS (non-blocking)
        try {
            String afterValue = String.format("Account|%s|%s|%.2f|%s",
                    accountId,
                    request.getAccountType(),
                    request.getInitialDeposit(),
                    request.getCurrency());
            
            sendAuditLogToSqs("CREATE", request.getClientId(), userContext.getUserId(), 
                            null, null, afterValue);
            log.debug("Published CREATE audit log for account {}", accountId);
        } catch (Exception e) {
            log.error("Failed to publish CREATE audit log for account {}: {}", accountId, e.getMessage());
            // Non-blocking: audit failure should not affect account creation
        }

        // 7. Send account creation email (async, non-blocking)
        emailService.sendAccountCreationEmail(client, savedAccount);
        log.info("Triggered async account creation email send for account {} to client {}", 
                accountId, client.getClientId());

        // 8. Convert to DTO and return
        return convertToAccountDTO(savedAccount);
    }

    /**
     * Soft delete an account (AGENT for own clients, ADMIN/ROOT_ADMIN for all)
     * Per specification:
     * - Can only delete if balance = 0
     * - Agent can delete accounts of their own clients
     * - Admin/Root Admin can delete any account
     * - Sends DELETE audit log to SQS
     * 
     * @param accountId the account ID to delete
     * @param userContext the authenticated user context
     */
    public void deleteAccount(String accountId, UserContext userContext) {
        log.info("Deleting account {}. User: {}, Role: {}", accountId, userContext.getUserId(), userContext.getRole());

        // 1. Fetch account
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> {
                    log.error("Account not found: {}", accountId);
                    return new AccountNotFoundException("Account not found");
                });

        // 2. Check if already deleted
        if (Boolean.TRUE.equals(account.getDeleted())) {
            log.error("Account already deleted: {}", accountId);
            throw new InvalidOperationException("Account has already been deleted");
        }

        // 3. Check balance = 0 (per specification)
        if (account.getBalance().compareTo(BigDecimal.ZERO) > 0) {
            log.error("Cannot delete account {} with non-zero balance: {}", accountId, account.getBalance());
            throw new InvalidOperationException(
                    String.format("Cannot delete account with non-zero balance. Current balance: %.2f", 
                            account.getBalance()));
        }

        // 4. Authorization check based on role
        if (userContext.getRole() == UserRole.AGENT) {
            // Agent can only delete accounts of their own clients
            Client client = clientRepository.findByClientIdAndDeletedFalse(account.getClientId())
                    .orElseThrow(() -> {
                        log.error("Client not found for account: {}", accountId);
                        return new ClientNotFoundException("Client not found or has been deleted");
                    });

            if (!client.getAgentId().equals(userContext.getUserId())) {
                log.error("Agent {} attempted to delete account {} owned by agent {}",
                        userContext.getUserId(), accountId, client.getAgentId());
                throw new ForbiddenException("You can only delete accounts for your own clients");
            }
        } else if (userContext.getRole() != UserRole.ADMIN && userContext.getRole() != UserRole.ROOT_ADMIN) {
            // Only AGENT, ADMIN, and ROOT_ADMIN can delete accounts
            log.error("Unauthorized role attempting to delete account: {}", userContext.getRole());
            throw new ForbiddenException("Insufficient permissions to delete accounts");
        }

        // 5. Perform soft delete
        String beforeValue = String.format("Account|%s|%s|%.2f",
                accountId,
                account.getAccountType(),
                account.getBalance());
        
        account.setDeleted(true);
        accountRepository.save(account);
        log.info("Account {} soft deleted successfully", accountId);

        // 6. Publish DELETE audit log to SQS (non-blocking)
        try {
            sendAuditLogToSqs("DELETE", account.getClientId(), userContext.getUserId(), 
                            null, beforeValue, null);
            log.debug("Published DELETE audit log for account {}", accountId);
        } catch (Exception e) {
            log.error("Failed to publish DELETE audit log for account {}: {}", accountId, e.getMessage());
            // Non-blocking: audit failure should not affect deletion
        }
        
        // 7. Send account deletion email to client (async, non-blocking)
        Client client = clientRepository.findByClientIdAndDeletedFalse(account.getClientId()).orElse(null);
        if (client != null) {
            emailService.sendAccountDeletionEmail(client, account);
            log.info("Triggered async account deletion email send for account {} to client {}", 
                    accountId, client.getClientId());
        }
    }
}
