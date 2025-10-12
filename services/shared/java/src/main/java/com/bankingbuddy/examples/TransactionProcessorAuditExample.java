package com.bankingbuddy.examples;

import com.bankingbuddy.audit.AuditLogger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

/**
 * Example demonstrating audit logging integration for transaction processing.
 * Shows how the transaction-processor service would integrate audit logging.
 */
public class TransactionProcessorAuditExample {

    private final AuditLogger auditLogger;

    public TransactionProcessorAuditExample() {
        // Standard AWS SDK setup - works with Lambda environment variables
        DynamoDbClient dynamoDbClient = DynamoDbClient.builder().build();
        
        // Simple initialization - just 4 lines of code!
        String tableName = System.getenv("AUDIT_TABLE_NAME");
        if (tableName == null) {
            tableName = "banking-buddy-dev-audit-logs"; // Fallback for testing
        }
        
        this.auditLogger = new AuditLogger(
            dynamoDbClient,
            tableName,                         // From Terraform environment variable or fallback
            "transaction-processor",           // Service name
            2555L                             // 7 years retention
        );
    }

    // Example: Processing a bank transaction
    public void processTransaction(String transactionId, String customerId, 
                                  double amount, String transactionType) {
        try {
            // Business logic...
            executeTransaction(transactionId, amount);
            
            // Audit the transaction processing - one simple call
            auditLogger.logCreate(
                transactionId,           // Client ID (transaction being processed)
                "system",               // Agent ID (automated system)
                String.format("Transaction: %s, Amount: %.2f, Customer: %s", 
                             transactionType, amount, customerId)
            );
            
        } catch (Exception e) {
            // Audit failed transactions too
            auditLogger.logCreate(
                transactionId,
                "system",
                String.format("FAILED Transaction: %s, Amount: %.2f, Error: %s", 
                             transactionType, amount, e.getMessage())
            );
            throw e;
        }
    }

    // Example: Balance inquiry audit
    public double checkBalance(String accountId, String customerId) {
        auditLogger.logRead(accountId, customerId); // Track balance checks
        return getAccountBalance(accountId);
    }

    // Example: Account status change
    public void updateAccountStatus(String accountId, String agentId, 
                                   String oldStatus, String newStatus) {
        auditLogger.logUpdate(
            accountId,           // Client ID (account being modified)
            agentId,            // Agent ID (bank employee)
            "Account Status",   // What changed
            oldStatus,          // Before value
            newStatus           // After value
        );
    }

    private void executeTransaction(String transactionId, double amount) {
        // Simulate transaction processing
        System.out.println("Processed transaction " + transactionId + " for $" + amount);
    }

    private double getAccountBalance(String accountId) {
        // Simulate balance lookup
        return 1000.00;
    }
}