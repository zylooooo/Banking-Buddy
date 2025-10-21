package com.BankingBuddy.client_service.model.dto;

import com.BankingBuddy.client_service.model.enums.AccountStatus;
import com.BankingBuddy.client_service.model.enums.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for Account responses
 * Used for single account operations and as nested object in Client responses
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountDTO {
    private String accountId;
    private String clientId;
    private AccountType accountType;
    private AccountStatus accountStatus;
    private LocalDate openingDate;
    private BigDecimal initialDeposit;
    private BigDecimal balance;
    private String currency;
    private String branchId;
    private Boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
