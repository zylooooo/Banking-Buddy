package com.BankingBuddy.client_service.model.dto;

import com.BankingBuddy.client_service.model.enums.AccountStatus;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO for updating existing accounts
 * Future use - not implemented in current specification
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAccountRequest {
    
    private AccountStatus accountStatus;
    
    @DecimalMin(value = "0.00", message = "Balance must be non-negative")
    private BigDecimal balance;
    
    private String branchId;
}
