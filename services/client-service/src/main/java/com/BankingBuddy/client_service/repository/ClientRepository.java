package com.BankingBuddy.client_service.repository;

import com.BankingBuddy.client_service.model.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, String> {

    /**
     * Check if a client with the given email exists and is not deleted
     * @param email the email to check
     * @return true if exists, false otherwise
     */
    boolean existsByEmailAndDeletedFalse(String email);

    /**
     * Check if a client with the given phone number exists and is not deleted
     * @param phoneNumber the phone number to check
     * @return true if exists, false otherwise
     */
    boolean existsByPhoneNumberAndDeletedFalse(String phoneNumber);

    /**
     * Find a client by client ID where deleted is false
     * @param clientId the client ID to search for
     * @return Optional containing the client if found and not deleted
     */
    Optional<Client> findByClientIdAndDeletedFalse(String clientId);

    /**
     * Find all clients assigned to a specific agent where deleted is false
     * @param agentId the agent ID to search for
     * @return List of clients assigned to the agent
     */
    List<Client> findByAgentIdAndDeletedFalse(String agentId);

    /**
     * Find a client by client ID
     * @param clientId the client ID to search for
     * @return Optional containing the client if found
     */
    Optional<Client> findByClientId(String clientId);
}
