package com.BankingBuddy.transaction_service.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TransactionTypes {
    DEPOSIT("Deposit"),
    WITHDRAWAL("Withdrawal");

    private final String value;

    TransactionTypes(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TransactionTypes fromValue(String value) {
        for (TransactionTypes type : TransactionTypes.values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Invalid transaction type: " + value);
    }
}
