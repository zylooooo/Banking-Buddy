package com.BankingBuddy.client_service.model.dto;

import com.BankingBuddy.client_service.model.enums.AccountStatus;
import com.BankingBuddy.client_service.model.enums.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for GET /api/accounts response
 * Includes account information with client details (from JOIN)
 * Used by Admin/Root Admin to view all accounts with associated client info
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountWithClientDTO {
    // Account fields
    private String accountId;
    private AccountType accountType;
    private AccountStatus accountStatus;
    private LocalDate openingDate;
    private BigDecimal initialDeposit;
    private BigDecimal balance;
    private String currency;
    private String branchId;
    private Boolean deleted;
    
    // Client fields (from JOIN)
    private String clientId;
    private String clientFullName;  // Computed: firstName + ' ' + lastName
    private String agentId;
}
