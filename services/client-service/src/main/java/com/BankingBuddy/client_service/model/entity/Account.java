package com.BankingBuddy.client_service.model.entity;

import com.BankingBuddy.client_service.model.enums.AccountStatus;
import com.BankingBuddy.client_service.model.enums.AccountType;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts",
        indexes = {
                @Index(name = "idx_client_id", columnList = "client_id"),
                @Index(name = "idx_account_type", columnList = "account_type"),
                @Index(name = "idx_account_status", columnList = "account_status"),
                @Index(name = "idx_deleted", columnList = "deleted"),
                @Index(name = "idx_opening_date", columnList = "opening_date"),
                @Index(name = "idx_client_deleted", columnList = "client_id, deleted")
        })
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    @Id
    @Column(name = "account_id", length = 255, nullable = false)
    private String accountId;

    @Column(name = "client_id", length = 255, nullable = false)
    private String clientId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", referencedColumnName = "client_id", insertable = false, updatable = false)
    private Client client;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 20)
    @NotNull(message = "Account type is required")
    private AccountType accountType;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 20)
    @NotNull(message = "Account status is required")
    @Builder.Default
    private AccountStatus accountStatus = AccountStatus.Pending;

    @Column(name = "opening_date", nullable = false)
    @NotNull(message = "Opening date is required")
    private LocalDate openingDate;

    @Column(name = "initial_deposit", nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Initial deposit is required")
    @DecimalMin(value = "0.01", message = "Initial deposit must be greater than 0")
    private BigDecimal initialDeposit;

    @Column(name = "balance", nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Balance is required")
    @DecimalMin(value = "0.00", message = "Balance must be non-negative")
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    @NotBlank(message = "Currency is required")
    @Size(min = 3, max = 3, message = "Currency must be 3 characters")
    @Builder.Default
    private String currency = "SGD";

    @Column(name = "branch_id", nullable = false, length = 50)
    @NotBlank(message = "Branch ID is required")
    @Size(min = 3, message = "Branch ID must be at least 3 characters")
    private String branchId;

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.openingDate == null) {
            this.openingDate = LocalDate.now();
        }
        if (this.balance == null) {
            this.balance = this.initialDeposit != null ? this.initialDeposit : BigDecimal.ZERO;
        }
        if (this.accountStatus == null) {
            this.accountStatus = AccountStatus.Pending;
        }
        if (this.currency == null) {
            this.currency = "SGD";
        }
        if (this.deleted == null) {
            this.deleted = false;
        }
    }
}
