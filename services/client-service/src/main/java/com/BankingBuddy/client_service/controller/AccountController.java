package com.BankingBuddy.client_service.controller;

import com.BankingBuddy.client_service.model.dto.AccountDTO;
import com.BankingBuddy.client_service.model.dto.AccountWithClientDTO;
import com.BankingBuddy.client_service.model.dto.ApiResponse;
import com.BankingBuddy.client_service.model.dto.CreateAccountRequest;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for account operations
 * Handles account management endpoints (Admin/Root Admin only)
 */
@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Slf4j
public class AccountController {

    private final AccountService accountService;

    /**
     * Get all accounts with client information
     * Admin and Root Admin only - agents cannot access this endpoint
     * Returns accounts with client full name and agent ID via JOIN
     * 
     * @param userContext the authenticated user context (ADMIN or ROOT_ADMIN only)
     * @return ResponseEntity with list of accounts including client information
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AccountWithClientDTO>>> getAllAccounts(
            @RequestAttribute("userContext") UserContext userContext) {

        log.info("GET /api/accounts called by user: {} (role: {})", 
                userContext.getUserId(), userContext.getRole());

        // Service layer handles authorization (defense in depth)
        List<AccountWithClientDTO> accounts = accountService.getAllAccounts(userContext);

        ApiResponse<List<AccountWithClientDTO>> response = 
                ApiResponse.success(accounts, "Accounts retrieved successfully");

        return ResponseEntity.ok(response);
    }

    /**
     * Create a new account for a client
     * Agent only - creates account for their own clients
     * Per specification: AGENT can create accounts for own clients
     * 
     * @param request the account creation request
     * @param userContext the authenticated user context (AGENT only)
     * @return ResponseEntity with created account data
     */
    @PostMapping
    public ResponseEntity<ApiResponse<AccountDTO>> createAccount(
            @Valid @RequestBody CreateAccountRequest request,
            @RequestAttribute("userContext") UserContext userContext) {

        log.info("POST /api/accounts called by user: {} (role: {})", 
                userContext.getUserId(), userContext.getRole());

        AccountDTO accountDTO = accountService.createAccount(request, userContext);

        ApiResponse<AccountDTO> response = ApiResponse.success(
                accountDTO,
                "Account created successfully"
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Soft delete an account
     * AGENT can delete accounts of their own clients
     * ADMIN and ROOT_ADMIN can delete any account
     * Per specification: Can only delete if balance = 0
     * 
     * @param accountId the account ID to delete
     * @param userContext the authenticated user context
     * @return ResponseEntity with success message
     */
    @DeleteMapping("/{accountId}")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @PathVariable String accountId,
            @RequestAttribute("userContext") UserContext userContext) {

        log.info("DELETE /api/accounts/{} called by user: {} (role: {})", 
                accountId, userContext.getUserId(), userContext.getRole());

        accountService.deleteAccount(accountId, userContext);

        ApiResponse<Void> response = ApiResponse.success(
                null,
                "Account deleted successfully"
        );

        return ResponseEntity.ok(response);
    }

    // Controller to get accounts by client client ID
    @GetMapping("/{clientId}")
    public ResponseEntity<ApiResponse<List<AccountDTO>>> getAccountsByClientId(
        @PathVariable String clientId,
        @RequestAttribute("userContext") UserContext userContext
    ) {
        log.info("GET /api/accounts/{} called by user: {} (role: {})", clientId, userContext.getUserId(), userContext.getRole());
        List<AccountDTO> accounts = accountService.getAccountsByClientId(clientId, userContext);
        ApiResponse<List<AccountDTO>> response = ApiResponse.success(accounts, "Accounts retrieved successfully");
        return ResponseEntity.ok(response);
    }
}
