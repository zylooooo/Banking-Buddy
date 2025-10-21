package com.BankingBuddy.client_service.service;

import com.BankingBuddy.client_service.model.dto.AccountWithClientDTO;
import com.BankingBuddy.client_service.model.entity.Account;
import com.BankingBuddy.client_service.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for account operations
 * Handles account management with authorization and audit logging
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private final AccountRepository accountRepository;

    /**
     * Get all accounts with client information (Admin/Root Admin only)
     * Uses JPA JOIN FETCH to get client data in single query
     * Returns AccountWithClientDTO with client fullName and agentId
     * No audit logs per specification (bulk reads not logged)
     * 
     * @return list of accounts with client information
     */
    public List<AccountWithClientDTO> getAllAccounts() {
        log.info("Retrieving all accounts with client information");
        
        // Use custom query that fetches accounts with client info via JOIN
        List<Account> accounts = accountRepository.findAllAccountsWithClientInfo();
        
        return accounts.stream()
                .map(this::convertToAccountWithClientDTO)
                .collect(Collectors.toList());
    }

    /**
     * Convert Account entity (with client) to AccountWithClientDTO
     * Computes clientFullName from firstName + lastName
     */
    private AccountWithClientDTO convertToAccountWithClientDTO(Account account) {
        return AccountWithClientDTO.builder()
                .accountId(account.getAccountId())
                .accountType(account.getAccountType())
                .accountStatus(account.getAccountStatus())
                .openingDate(account.getOpeningDate())
                .initialDeposit(account.getInitialDeposit())
                .balance(account.getBalance())
                .currency(account.getCurrency())
                .branchId(account.getBranchId())
                .deleted(account.getDeleted())
                .clientId(account.getClientId())
                .clientFullName(account.getClient().getFirstName() + " " + account.getClient().getLastName())
                .agentId(account.getClient().getAgentId())
                .build();
    }
}
