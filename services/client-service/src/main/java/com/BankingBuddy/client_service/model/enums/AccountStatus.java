package com.BankingBuddy.client_service.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AccountStatus {
    Active("Active"),
    Inactive("Inactive"),
    Pending("Pending");
    
    private final String value;
    
    AccountStatus(String value) {
        this.value = value;
    }
    
    @JsonValue
    public String getValue() {
        return value;
    }
    
    @JsonCreator
    public static AccountStatus fromValue(String value) {
        for (AccountStatus status : AccountStatus.values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid account status: " + value);
    }
}
