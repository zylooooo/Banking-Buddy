package com.BankingBuddy.transaction_service.repository;

import com.BankingBuddy.transaction_service.model.entity.Transaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String>, JpaSpecificationExecutor<Transaction> {

    @NonNull
    Page<Transaction> findAll(@NonNull Pageable pageable);
    
    @NonNull
    Page<Transaction> findByClientId(@NonNull String clientId, @NonNull Pageable pageable);
}
