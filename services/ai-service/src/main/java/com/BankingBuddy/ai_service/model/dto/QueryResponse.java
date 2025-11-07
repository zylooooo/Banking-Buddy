package com.BankingBuddy.ai_service.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueryResponse {
    private String naturalLanguageResponse;
    private String queryType; // "client", "transaction", "account", etc.
    private List<Map<String, Object>> results;
    private String sqlQuery; // For debugging/transparency
}
