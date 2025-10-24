package com.BankingBuddy.transaction_service.utils;

import com.BankingBuddy.transaction_service.model.dto.TransactionSearchRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class AtLeastOneFilterValidator implements ConstraintValidator<AtLeastOneFilter, TransactionSearchRequest> {
    
    @Override
    public boolean isValid(TransactionSearchRequest request, ConstraintValidatorContext context) {
        if (request == null) return false;
        
        // Check if at least one filter is provided
        return request.getClientId() != null ||
               request.getTransaction() != null ||
               request.getStatus() != null ||
               request.getMinAmount() != null ||
               request.getMaxAmount() != null ||
               request.getStartDate() != null ||
               request.getEndDate() != null;
    }
}
