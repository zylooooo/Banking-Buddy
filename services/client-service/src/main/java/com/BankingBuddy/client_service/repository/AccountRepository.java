package com.BankingBuddy.client_service.repository;

import com.BankingBuddy.client_service.model.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {

    /**
     * Find all non-deleted accounts for a specific client
     */
    List<Account> findByClientIdAndDeletedFalse(String clientId);

    /**
     * Find all non-deleted accounts
     */
    List<Account> findAllByDeletedFalse();

    /**
     * Find account by ID (only if not deleted)
     */
    Optional<Account> findByAccountIdAndDeletedFalse(String accountId);

    /**
     * Find all accounts with client information (for GET /api/accounts)
     * This query joins accounts with clients to get client details
     */
    @Query("SELECT a FROM Account a " +
           "JOIN FETCH a.client c " +
           "WHERE a.deleted = false AND c.deleted = false " +
           "ORDER BY a.createdAt DESC")
    List<Account> findAllAccountsWithClientInfo();
}
