package com.BankingBuddy.client_service.model.dto;

import com.BankingBuddy.client_service.model.enums.AccountStatus;
import com.BankingBuddy.client_service.model.enums.AccountType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO for creating new accounts
 * Used by POST /api/accounts endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAccountRequest {
    
    @NotBlank(message = "Client ID is required")
    private String clientId;
    
    @NotNull(message = "Account type is required")
    private AccountType accountType;
    
    @NotNull(message = "Account status is required")
    @Builder.Default
    private AccountStatus accountStatus = AccountStatus.Pending;
    
    @NotNull(message = "Initial deposit is required")
    @DecimalMin(value = "0.01", message = "Initial deposit must be greater than 0")
    private BigDecimal initialDeposit;
    
    @NotBlank(message = "Currency is required")
    @Size(min = 3, max = 3, message = "Currency must be 3 characters (e.g., SGD)")
    @Builder.Default
    private String currency = "SGD";
    
    @NotBlank(message = "Branch ID is required")
    @Size(min = 3, message = "Branch ID must be at least 3 characters")
    private String branchId;
}
