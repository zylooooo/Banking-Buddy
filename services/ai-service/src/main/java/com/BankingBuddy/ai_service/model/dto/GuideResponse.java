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
public class GuideResponse {
    private String answer;
    private List<String> relatedTopics;
    private String source;
}
