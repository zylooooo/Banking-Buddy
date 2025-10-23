package com.BankingBuddy.transaction_service.model.dto;

import com.BankingBuddy.transaction_service.model.enums.TransactionTypes;
import com.BankingBuddy.transaction_service.model.enums.TransactionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDTO {
    private String id;
    private String clientId;
    private TransactionTypes transaction;
    private BigDecimal amount;
    private LocalDateTime date;
    private TransactionStatus status;
}
