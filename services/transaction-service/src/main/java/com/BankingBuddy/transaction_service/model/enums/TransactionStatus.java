package com.BankingBuddy.transaction_service.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TransactionStatus {
    COMPLETED("Completed"),
    PENDING("Pending"),
    FAILED("Failed");

    private final String value;

    TransactionStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TransactionStatus fromValue(String value) {
        for (TransactionStatus status : TransactionStatus.values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid transaction status: " + value);
    }
}
