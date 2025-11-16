package com.BankingBuddy.client_service.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Gender {
    Male("Male"),
    Female("Female"),
    Non_binary("Non_binary"),
    Prefer_not_to_say("Prefer_not_to_say");
    
    private final String value;
    
    Gender(String value) {
        this.value = value;
    }
    
    @JsonValue
    public String getValue() {
        return value;
    }
    
    @JsonCreator
    public static Gender fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Gender value cannot be null");
        }
        
        // Normalize the input by replacing spaces and hyphens with underscores
        String normalizedValue = value.trim().replace(" ", "_").replace("-", "_");
        
        for (Gender gender : Gender.values()) {
            // Compare the normalized input with the enum value
            if (gender.value.equalsIgnoreCase(normalizedValue)) {
                return gender;
            }
        }
        throw new IllegalArgumentException("Invalid gender: " + value);
    }
}
