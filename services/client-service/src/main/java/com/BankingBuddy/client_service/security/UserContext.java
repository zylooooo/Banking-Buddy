package com.BankingBuddy.client_service.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserContext {
    private String userId; // Cognito sub
    private String email;
    private String username;
    private UserRole role;
    private boolean emailVerified;
}
