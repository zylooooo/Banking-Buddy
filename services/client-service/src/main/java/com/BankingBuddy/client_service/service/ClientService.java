package com.BankingBuddy.client_service.service;

import com.BankingBuddy.client_service.exception.ClientAlreadyExistsException;
import com.BankingBuddy.client_service.exception.ForbiddenException;
import com.BankingBuddy.client_service.exception.InvalidOperationException;
import com.BankingBuddy.client_service.model.dto.ClientDTO;
import com.BankingBuddy.client_service.model.dto.CreateClientRequest;
import com.BankingBuddy.client_service.model.entity.Client;
import com.BankingBuddy.client_service.repository.ClientRepository;
import com.BankingBuddy.client_service.security.UserContext;
import com.BankingBuddy.client_service.security.UserRole;
import com.bankingbuddy.audit.AuditPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClientService {

    private final ClientRepository clientRepository;
    private final AuditPublisher auditPublisher;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Create a new client profile
     * 
     * @param request the client creation request
     * @param userContext the authenticated user context
     * @return the created client DTO
     */
    @Transactional
    public ClientDTO createClient(CreateClientRequest request, UserContext userContext) {
        log.info("Creating client profile. Agent: {}", userContext.getUserId());

        // 1. Authorization check - only AGENT and ADMIN can create clients
        if (userContext.getRole() != UserRole.AGENT && userContext.getRole() != UserRole.ADMIN) {
            log.error("Unauthorized role attempting to create client: {}", userContext.getRole());
            throw new ForbiddenException("Only AGENT or ADMIN roles can create client profiles");
        }

        // 2. Validate age consistency
        validateAgeConsistency(request.getDateOfBirth(), request.getAge());

        // 3. Check email uniqueness
        if (clientRepository.existsByEmailAndDeletedFalse(request.getEmail())) {
            log.error("Email already exists: {}", request.getEmail());
            throw new ClientAlreadyExistsException("A client with this email already exists");
        }

        // 4. Check phone number uniqueness
        if (clientRepository.existsByPhoneNumberAndDeletedFalse(request.getPhoneNumber())) {
            log.error("Phone number already exists: {}", request.getPhoneNumber());
            throw new ClientAlreadyExistsException("A client with this phone number already exists");
        }

        // 5. Generate client ID
        String clientId = "CLT-" + UUID.randomUUID().toString();

        // 6. Build and save client entity
        Client client = Client.builder()
                .clientId(clientId)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dateOfBirth(request.getDateOfBirth())
                .age(request.getAge())
                .gender(request.getGender())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .country(request.getCountry())
                .accountType(request.getAccountType())
                .accountStatus(request.getAccountStatus())
                .agentId(userContext.getUserId())
                .notes(request.getNotes())
                .deleted(false)
                .build();

        Client savedClient = clientRepository.save(client);
        log.info("Client created successfully with ID: {}", clientId);

        // 7. Publish audit log (non-blocking, fire-and-forget)
        publishAuditLog(savedClient, userContext);

        // 8. Convert to DTO and return
        return convertToDTO(savedClient);
    }

    /**
     * Validate that age matches date of birth
     */
    private void validateAgeConsistency(LocalDate dateOfBirth, Integer age) {
        int calculatedAge = Period.between(dateOfBirth, LocalDate.now()).getYears();
        
        if (Math.abs(calculatedAge - age) > 1) {
            log.error("Age inconsistency: provided age {}, calculated age {}", age, calculatedAge);
            throw new InvalidOperationException(
                    String.format("Age provided (%d) does not match date of birth (calculated: %d)", age, calculatedAge)
            );
        }
    }

    /**
     * Publish audit log for client creation
     */
    private void publishAuditLog(Client client, UserContext userContext) {
        try {
            Map<String, Object> clientData = new HashMap<>();
            clientData.put("clientId", client.getClientId());
            clientData.put("firstName", client.getFirstName());
            clientData.put("lastName", client.getLastName());
            clientData.put("email", client.getEmail());
            clientData.put("phoneNumber", client.getPhoneNumber());
            clientData.put("gender", client.getGender().getValue());
            clientData.put("accountType", client.getAccountType().getValue());
            clientData.put("accountStatus", client.getAccountStatus().getValue());
            clientData.put("agentId", client.getAgentId());

            // Convert client data to JSON string
            String afterValue = objectMapper.writeValueAsString(clientData);

            auditPublisher.logCreate(
                    client.getClientId(),
                    userContext.getUserId(),
                    afterValue
            );

            log.info("Audit log published for client creation: {}", client.getClientId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize client data to JSON: {}", e.getMessage(), e);
        } catch (Exception e) {
            // Don't fail the request if audit logging fails
            log.error("Failed to publish audit log for client {}: {}", client.getClientId(), e.getMessage(), e);
        }
    }

    /**
     * Convert Client entity to ClientDTO
     */
    private ClientDTO convertToDTO(Client client) {
        return ClientDTO.builder()
                .clientId(client.getClientId())
                .firstName(client.getFirstName())
                .lastName(client.getLastName())
                .dateOfBirth(client.getDateOfBirth())
                .age(client.getAge())
                .gender(client.getGender())
                .email(client.getEmail())
                .phoneNumber(client.getPhoneNumber())
                .address(client.getAddress())
                .city(client.getCity())
                .state(client.getState())
                .postalCode(client.getPostalCode())
                .country(client.getCountry())
                .accountType(client.getAccountType())
                .accountStatus(client.getAccountStatus())
                .agentId(client.getAgentId())
                .notes(client.getNotes())
                .createdAt(client.getCreatedAt())
                .updatedAt(client.getUpdatedAt())
                .build();
    }
}
