package com.BankingBuddy.transaction_service.service;

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
     * Get all transactions with pagination
     * Cached in Redis with key: transactions:all:page:{page}:limit:{limit}
     * TTL: 10 minutes
     */
    @Cacheable(value = "transactions", key = "'all:page:' + #page + ':limit:' + #limit")
    public Page<TransactionDTO> getAllTransactions(int page, int limit) {
        log.info("Fetching all transactions with page: {} and limit {} (cache miss - querying database)", page, limit);

        Pageable pageable = PageRequest.of(page, limit, Sort.by("date").descending());
        Page<Transaction> transactions = transactionRepository.findAll(pageable);
        log.info("Successfully fetched {} transactions from database", transactions.getTotalElements());

        return transactions.map(this::mapToDTO);
    }

    /**
     * Get all transactions for a specific client with pagination
     * Cached in Redis with key: transactions:client:{clientId}:page:{page}:limit:{limit}
     * TTL: 10 minutes
     */
    @Cacheable(value = "transactions", key = "'client:' + #clientId + ':page:' + #page + ':limit:' + #limit")
    public Page<TransactionDTO> getAllTransactionsForClient(String clientId, int page, int limit) {
        log.info("Fetching all transactions for client: {} with page: {} and limit: {} (cache miss - querying database)", clientId, page, limit);

        Pageable pageable = PageRequest.of(page, limit, Sort.by("date").descending());
        Page<Transaction> transactions = transactionRepository.findByClientId(clientId, pageable);
        log.info("Found {} transactions for client {} from database", transactions.getTotalElements(), clientId);

        return transactions.map(this::mapToDTO);
    }

    /**
     * Search transactions with flexible filters
     * Cached in Redis using hash of search request
     * Note: Search queries have many combinations, so cache hit rate may be lower
     * TTL: 10 minutes
     */
    @Cacheable(value = "transactions", key = "'search:' + T(java.util.Objects).hash(#searchRequest)")
    public Page<TransactionDTO> searchTransactions(TransactionSearchRequest searchRequest) {
        log.info("Searching transactions with filters: {} (cache miss - querying database)", searchRequest);

        // Build dynamic query using the new approach
        Specification<Transaction> spec = Specification.allOf(); // This replaces Specification.where(null)

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
        log.info("Found {} transactions matching search criteria from database", transactions.getTotalElements());

        return transactions.map(this::mapToDTO);
    }
}
