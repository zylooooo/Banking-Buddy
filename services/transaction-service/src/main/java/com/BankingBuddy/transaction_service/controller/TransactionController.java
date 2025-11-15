package com.BankingBuddy.transaction_service.controller;

import com.BankingBuddy.transaction_service.model.dto.*;
import com.BankingBuddy.transaction_service.security.UserContext;
import com.BankingBuddy.transaction_service.service.TransactionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;


@RestController
@RequestMapping("/api/v1/transactions")
@Slf4j
public class TransactionController {
    
    private final TransactionService transactionService;
    private static final int MAX_LIMIT = 10;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    private int validateLimit(int limit, String userId) {
        if (limit < 0) {
            log.warn("User {} provided invalid limit: {}, defaulting to 10", userId, limit);
            return MAX_LIMIT;
        }

        if (limit > MAX_LIMIT) {
            log.warn("User {} attempted to set limit to {}, maximum allowed is {}", userId, limit, MAX_LIMIT);
        }
        return Math.min(limit, MAX_LIMIT);
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<PageDTO<TransactionDTO>>> getAllTransactions(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int limit,
        HttpServletRequest httpRequest
    ) {
        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        log.info("GET /api/transactions/all called by user: {}", currentUser.getUserId());

        limit = validateLimit(limit, currentUser.getUserId());
        PageDTO<TransactionDTO> transactions = transactionService.getAllTransactions(page, limit);
        ApiResponse<PageDTO<TransactionDTO>> response = ApiResponse.success(transactions, "Transactions retrieved successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageDTO<TransactionDTO>>> getAllTransactionsForClient(
        @RequestParam(required = true) String clientId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int limit,
        HttpServletRequest httpRequest
    ) {
        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        log.info("GET /api/transactions called by user: {}", currentUser.getUserId());

        limit = validateLimit(limit, currentUser.getUserId());
        PageDTO<TransactionDTO> transactions = transactionService.getAllTransactionsForClient(clientId, page, limit);

        ApiResponse<PageDTO<TransactionDTO>> response = ApiResponse.success(transactions, "Transactions retrieved successfully");
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageDTO<TransactionDTO>>> searchTransactions(
        @Valid @ModelAttribute TransactionSearchRequest searchRequest,
        HttpServletRequest httpRequest
    ) {
        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        log.info("GET /api/transactions/search called by user: {}", currentUser.getUserId());

        searchRequest.setLimit(validateLimit(searchRequest.getLimit(), currentUser.getUserId()));
        PageDTO<TransactionDTO> transactions = transactionService.searchTransactions(searchRequest);

        ApiResponse<PageDTO<TransactionDTO>> response = ApiResponse.success(transactions, "Transactions retrieved successfully");
        return ResponseEntity.ok(response);
    }
}
