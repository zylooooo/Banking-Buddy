package com.bankingbuddy.examples;

import com.bankingbuddy.audit.AuditLogger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

/**
 * Example demonstrating how easy it is for other services to integrate audit logging.
 * This simulates how the user-service or transaction-processor would use the audit logger.
 */
public class UserServiceAuditExample {

    private final AuditLogger auditLogger;

    public UserServiceAuditExample() {
        // Step 1: Create DynamoDB client (standard AWS SDK setup)
        DynamoDbClient dynamoDbClient = DynamoDbClient.builder().build();
        
        // Step 2: Initialize audit logger (only 3 parameters needed!)
        this.auditLogger = new AuditLogger(
            dynamoDbClient,
            "banking-buddy-dev-audit-logs",  // Table name from Terraform output
            "user-service",                  // Service name
            2555L                           // 7 years retention
        );
    }

    // Example: User profile update audit
    public void updateUserProfile(String userId, String agentId, 
                                 String oldEmail, String newEmail) {
        try {
            // Business logic here...
            updateUserInDatabase(userId, newEmail);
            
            // Audit logging - just one line!
            auditLogger.logUpdate(
                userId,                    // Client ID (user being modified)
                agentId,                   // Agent ID (who made the change)
                "Email Address",           // What was changed
                oldEmail,                  // Before value
                newEmail                   // After value
            );
            
        } catch (Exception e) {
            // If audit logging fails, the entire operation fails (mission-critical)
            throw new RuntimeException("Failed to update user profile", e);
        }
    }

    // Example: User login audit
    public void recordUserLogin(String userId) {
        auditLogger.logRead(userId, "system"); // Simple read operation
    }

    // Example: User account creation
    public void createUserAccount(String userId, String agentId, String userDetails) {
        auditLogger.logCreate(userId, agentId, userDetails);
    }

    // Example: User account deletion
    public void deleteUserAccount(String userId, String agentId, String userDetails) {
        auditLogger.logDelete(userId, agentId, userDetails);
    }

    private void updateUserInDatabase(String userId, String newEmail) {
        // Simulate database update
        System.out.println("Updated user " + userId + " email to " + newEmail);
    }
}