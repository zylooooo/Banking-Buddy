package com.BankingBuddy.client_service.controller;

import com.BankingBuddy.client_service.model.dto.AccountWithClientDTO;
import com.BankingBuddy.client_service.model.dto.ApiResponse;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.service.AccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for account operations
 * Handles account management endpoints (Admin/Root Admin only)
 */
@RestController
@RequestMapping("/api/accounts")
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

        // Authorization check - only ADMIN and ROOT_ADMIN can access
        if (userContext.getRole() != com.BankingBuddy.client_service.security.UserRole.ADMIN && 
            userContext.getRole() != com.BankingBuddy.client_service.security.UserRole.ROOT_ADMIN) {
            log.error("Unauthorized role attempting to get all accounts: {}", userContext.getRole());
            throw new com.BankingBuddy.client_service.exception.ForbiddenException(
                    "Only ADMIN or ROOT_ADMIN roles can access all accounts");
        }

        List<AccountWithClientDTO> accounts = accountService.getAllAccounts();

        ApiResponse<List<AccountWithClientDTO>> response = 
                ApiResponse.success(accounts, "Accounts retrieved successfully");

        return ResponseEntity.ok(response);
    }
}
