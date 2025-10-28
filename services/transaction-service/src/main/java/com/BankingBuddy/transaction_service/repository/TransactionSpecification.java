package com.BankingBuddy.transaction_service.repository;

import com.BankingBuddy.transaction_service.model.entity.Transaction;
import com.BankingBuddy.transaction_service.model.enums.TransactionStatus;
import com.BankingBuddy.transaction_service.model.enums.TransactionTypes;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class TransactionSpecification {
    
    public static Specification<Transaction> hasClientIdsIn(List<String> clientIds) {
        return (root, query, criteriaBuilder) -> 
            clientIds == null || clientIds.isEmpty() ? null : 
                root.get("clientId").in(clientIds);
    }
    
    public static Specification<Transaction> hasTransactionType(TransactionTypes transaction) {
        return (root, query, criteriaBuilder) -> 
            transaction == null ? null : criteriaBuilder.equal(root.get("transaction"), transaction);
    }
    
    public static Specification<Transaction> hasStatus(TransactionStatus status) {
        return (root, query, criteriaBuilder) -> 
            status == null ? null : criteriaBuilder.equal(root.get("status"), status);
    }
    
    public static Specification<Transaction> amountBetween(BigDecimal minAmount, BigDecimal maxAmount) {
        return (root, query, criteriaBuilder) -> {
            if (minAmount == null && maxAmount == null) return null;
            if (minAmount == null) return criteriaBuilder.lessThanOrEqualTo(root.get("amount"), maxAmount);
            if (maxAmount == null) return criteriaBuilder.greaterThanOrEqualTo(root.get("amount"), minAmount);
            return criteriaBuilder.between(root.get("amount"), minAmount, maxAmount);
        };
    }
    
    public static Specification<Transaction> dateBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, criteriaBuilder) -> {
            if (startDate == null && endDate == null) return null;
            if (startDate == null) return criteriaBuilder.lessThanOrEqualTo(root.get("date"), endDate);
            if (endDate == null) return criteriaBuilder.greaterThanOrEqualTo(root.get("date"), startDate);
            return criteriaBuilder.between(root.get("date"), startDate, endDate);
        };
    }
}
