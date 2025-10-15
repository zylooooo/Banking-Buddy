package com.BankingBuddy.user_service.model.dto;

import com.BankingBuddy.user_service.security.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private UserRole role;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
