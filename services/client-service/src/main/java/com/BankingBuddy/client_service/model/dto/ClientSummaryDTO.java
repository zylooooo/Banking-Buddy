package com.BankingBuddy.client_service.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for GET /api/clients response (agent's client list)
 * Simplified view of client information for list display
 * Used on "Manage Profiles" page
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientSummaryDTO {
    private String clientId;
    private String fullName;  // Computed: firstName + ' ' + lastName
    private Boolean verified;
    private String email;
    private String phoneNumber;
}
