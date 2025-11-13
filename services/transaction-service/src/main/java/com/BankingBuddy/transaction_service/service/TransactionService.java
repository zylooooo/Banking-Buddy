package com.BankingBuddy.transaction_service.service;

import com.BankingBuddy.transaction_service.model.dto.PageDTO;
import com.BankingBuddy.transaction_service.model.dto.TransactionDTO;
import com.BankingBuddy.transaction_service.model.dto.TransactionSearchRequest;
import com.BankingBuddy.transaction_service.repository.TransactionRepository;
import com.BankingBuddy.transaction_service.repository.TransactionSpecification;
import com.BankingBuddy.transaction_service.model.entity.Transaction;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.domain.Specification;

@Service
@Slf4j
@Transactional(readOnly = true)
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    private TransactionDTO mapToDTO(Transaction transaction) {
        return TransactionDTO.builder()
                .id(transaction.getId())
                .clientId(transaction.getClientId())
                .transaction(transaction.getTransaction())
                .amount(transaction.getAmount())
                .date(transaction.getDate())
                .status(transaction.getStatus())
                .build();
    }

    /**
     * Get all transactions with pagination. Cached for 10 minutes.
     */
    @Cacheable(value = "transactions", key = "'all:page:' + #page + ':limit:' + #limit")
    public PageDTO<TransactionDTO> getAllTransactions(int page, int limit) {
        log.info("Fetching all transactions from database: page={}, limit={}", page, limit);
        Pageable pageable = PageRequest.of(page, limit, Sort.by("date").descending());
        Page<Transaction> transactions = transactionRepository.findAll(pageable);
        return PageDTO.from(transactions.map(this::mapToDTO));
    }

    /**
     * Get all transactions for a specific client with pagination. Cached for 10 minutes.
     */
    @Cacheable(value = "transactions", key = "'client:' + #clientId + ':page:' + #page + ':limit:' + #limit")
    public PageDTO<TransactionDTO> getAllTransactionsForClient(String clientId, int page, int limit) {
        log.info("Fetching transactions from database: clientId={}, page={}, limit={}", clientId, page, limit);
        Pageable pageable = PageRequest.of(page, limit, Sort.by("date").descending());
        Page<Transaction> transactions = transactionRepository.findByClientId(clientId, pageable);
        return PageDTO.from(transactions.map(this::mapToDTO));
    }

    /**
     * Search transactions with flexible filters.
     * 
     * Intelligent Caching:
     * - Cached when only clientIds are provided (agents viewing all their transactions)
     * - Not cached when filters are applied (prevents memory waste from low-reuse combinations)
     */
    @Cacheable(
        value = "transactions",
        key = "'search:' + T(String).join(',', #searchRequest.clientIds.stream().sorted().toList()) + ':p:' + #searchRequest.page + ':l:' + #searchRequest.limit + ':s:' + #searchRequest.sortBy + ':' + #searchRequest.sortDirection",
        condition = "#searchRequest.clientIds != null && !#searchRequest.clientIds.isEmpty() && " +
                    "#searchRequest.transaction == null && #searchRequest.status == null && " +
                    "#searchRequest.minAmount == null && #searchRequest.maxAmount == null && " +
                    "#searchRequest.startDate == null && #searchRequest.endDate == null"
    )
    public PageDTO<TransactionDTO> searchTransactions(TransactionSearchRequest searchRequest) {
        log.info("Searching transactions with filters: {}", searchRequest);

        // Build dynamic query using specification pattern
        Specification<Transaction> spec = Specification.allOf();

        if (searchRequest.getClientIds() != null) {
            spec = spec.and(TransactionSpecification.hasClientIdsIn(searchRequest.getClientIds()));
        }
        if (searchRequest.getTransaction() != null) {
            spec = spec.and(TransactionSpecification.hasTransactionType(searchRequest.getTransaction()));
        }
        if (searchRequest.getStatus() != null) {
            spec = spec.and(TransactionSpecification.hasStatus(searchRequest.getStatus()));
        }
        if (searchRequest.getMinAmount() != null || searchRequest.getMaxAmount() != null) {
            spec = spec.and(TransactionSpecification.amountBetween(
                    searchRequest.getMinAmount(), searchRequest.getMaxAmount()));
        }
        if (searchRequest.getStartDate() != null || searchRequest.getEndDate() != null) {
            spec = spec.and(TransactionSpecification.dateBetween(
                    searchRequest.getStartDate(), searchRequest.getEndDate()));
        }

        // Create pageable with dynamic sorting
        Sort sort = Sort.by(
                "desc".equalsIgnoreCase(searchRequest.getSortDirection())
                        ? Sort.Direction.DESC
                        : Sort.Direction.ASC,
                searchRequest.getSortBy());
        Pageable pageable = PageRequest.of(searchRequest.getPage(), searchRequest.getLimit(), sort);

        Page<Transaction> transactions = transactionRepository.findAll(spec, pageable);
        return PageDTO.from(transactions.map(this::mapToDTO));
    }
}
