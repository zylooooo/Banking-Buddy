package com.BankingBuddy.transaction_service.model.dto;

import com.BankingBuddy.transaction_service.model.enums.TransactionStatus;
import com.BankingBuddy.transaction_service.model.enums.TransactionTypes;
import com.BankingBuddy.transaction_service.utils.AtLeastOneFilter;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@AtLeastOneFilter
public class TransactionSearchRequest {
    
    private List<String> clientIds;
    
    private TransactionTypes transaction;
    
    private TransactionStatus status;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Min amount must be greater than 0")
    private BigDecimal minAmount;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Max amount must be greater than 0")
    private BigDecimal maxAmount;
    
    @PastOrPresent(message = "Start date cannot be in the future")
    private LocalDateTime startDate;
    
    @PastOrPresent(message = "End date cannot be in the future")
    private LocalDateTime endDate;
    
    @Min(value = 0, message = "Page must be non-negative")
    @Builder.Default
    private int page = 0;
    
    @Min(value = 1, message = "Limit must be at least 1")
    @Max(value = 10, message = "Limit cannot exceed 10")
    @Builder.Default
    private int limit = 10;
    
    @Pattern(regexp = "^(date|amount|status|transaction)$", message = "Invalid sort field. Must be: date, amount, status, or transaction")
    @Builder.Default
    private String sortBy = "date";
    
    @Pattern(regexp = "^(asc|desc)$", message = "Sort direction must be 'asc' or 'desc'")
    @Builder.Default
    private String sortDirection = "desc";
}
