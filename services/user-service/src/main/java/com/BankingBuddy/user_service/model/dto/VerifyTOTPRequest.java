package com.BankingBuddy.user_service.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyTOTPRequest {
    @NotBlank(message = "Access token is required")
    private String accessToken;
    
    @NotBlank(message = "TOTP code is required")
    private String totpCode;
}

