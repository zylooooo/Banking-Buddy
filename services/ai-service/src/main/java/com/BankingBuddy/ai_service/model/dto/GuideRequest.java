package com.BankingBuddy.ai_service.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GuideRequest {
    @NotBlank(message = "Question is required")
    private String question;
}
