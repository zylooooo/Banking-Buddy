package com.BankingBuddy.client_service.controller;

import com.BankingBuddy.client_service.model.dto.ApiResponse;
import com.BankingBuddy.client_service.model.dto.ClientDTO;
import com.BankingBuddy.client_service.model.dto.CreateClientRequest;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
@Slf4j
public class ClientController {

    private final ClientService clientService;

    /**
     * Create a new client profile
     * 
     * @param request the client creation request with validation
     * @param userContext the authenticated user context (injected by interceptor)
     * @return ResponseEntity with created client data
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ClientDTO>> createClient(
            @Valid @RequestBody CreateClientRequest request,
            @RequestAttribute("userContext") UserContext userContext) {

        log.info("POST /api/clients called by user: {}", userContext.getUserId());

        ClientDTO clientDTO = clientService.createClient(request, userContext);

        ApiResponse<ClientDTO> response = ApiResponse.success(
                clientDTO,
                "Client profile created successfully"
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
