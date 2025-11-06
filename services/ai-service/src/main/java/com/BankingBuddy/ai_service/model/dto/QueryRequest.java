package com.BankingBuddy.ai_service.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class QueryRequest {
    @NotBlank(message = "Query is required")
    private String query;
}