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
     * Get all transactions with pagination
     * 
     * Cached in Redis with key: transactions:all:page:{page}:limit:{limit}
     * TTL: 10 minutes (configured in RedisConfig)
     * 
     * Cache Strategy: This endpoint has high hit rate since many agents
     * view the same pages of recent transactions.
     * 
     * @param page Page number (0-indexed)
     * @param limit Number of items per page
     * @return PageDTO with transaction data and pagination metadata
     */
    @Cacheable(value = "transactions", key = "'all:page:' + #page + ':limit:' + #limit")
    public PageDTO<TransactionDTO> getAllTransactions(int page, int limit) {
        // Note: This log only appears on cache miss. Cache hits don't execute this method.
        log.info("Cache miss - fetching all transactions from database: page={}, limit={}", page, limit);

        Pageable pageable = PageRequest.of(page, limit, Sort.by("date").descending());
        Page<Transaction> transactions = transactionRepository.findAll(pageable);
        log.info("Fetched {} total transactions from database", transactions.getTotalElements());

        return PageDTO.from(transactions.map(this::mapToDTO));
    }

    /**
     * Get all transactions for a specific client with pagination
     * 
     * Cached in Redis with key: transactions:client:{clientId}:page:{page}:limit:{limit}
     * TTL: 10 minutes (configured in RedisConfig)
     * 
     * Cache Strategy: Very high hit rate - agents repeatedly view the same client's
     * transactions. This is the most valuable cache in the transaction service.
     * 
     * @param clientId Client identifier
     * @param page Page number (0-indexed)
     * @param limit Number of items per page
     * @return PageDTO with transaction data and pagination metadata
     */
    @Cacheable(value = "transactions", key = "'client:' + #clientId + ':page:' + #page + ':limit:' + #limit")
    public PageDTO<TransactionDTO> getAllTransactionsForClient(String clientId, int page, int limit) {
        // Note: This log only appears on cache miss. Cache hits don't execute this method.
        log.info("Cache miss - fetching transactions from database: clientId={}, page={}, limit={}", clientId, page, limit);

        Pageable pageable = PageRequest.of(page, limit, Sort.by("date").descending());
        Page<Transaction> transactions = transactionRepository.findByClientId(clientId, pageable);
        log.info("Fetched {} total transactions for client {} from database", transactions.getTotalElements(), clientId);

        return PageDTO.from(transactions.map(this::mapToDTO));
    }

    /**
     * Search transactions with flexible filters
     * 
     * INTELLIGENT CACHING:
     * - CACHED when ONLY clientIds + pagination are provided (agent viewing "all their transactions")
     * - NOT CACHED when additional filters are applied (status, dates, amounts, etc.)
     * 
     * Cache Strategy:
     * - Agents repeatedly view their transactions with the same clientIds → High hit rate (80-90%)
     * - Complex searches with filters → No cache (low hit rate, wastes memory)
     * - Cache key uses sorted clientIds for consistency regardless of order
     * 
     * Performance:
     * - Cached: ~5ms (Redis lookup)
     * - Uncached: ~50-100ms (Database query)
     * 
     * Error Handling:
     * - If cache fails, the cacheErrorHandler logs warning and method executes normally
     * - Application never fails due to cache issues (cache-aside pattern)
     * 
     * @param searchRequest Search filters and pagination parameters
     * @return PageDTO with filtered transaction data
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
        // This log only appears on cache miss (when cache condition is false or cache doesn't exist)
        // If you see this log, it means the method executed (cache miss or no caching)
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
        log.info("Found {} total transactions matching search criteria", transactions.getTotalElements());

        return PageDTO.from(transactions.map(this::mapToDTO));
    }
}
