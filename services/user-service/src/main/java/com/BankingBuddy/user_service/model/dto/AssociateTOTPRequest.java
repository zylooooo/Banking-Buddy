package com.BankingBuddy.user_service.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssociateTOTPRequest {
    @NotBlank(message = "Access token is required")
    private String accessToken;
}

