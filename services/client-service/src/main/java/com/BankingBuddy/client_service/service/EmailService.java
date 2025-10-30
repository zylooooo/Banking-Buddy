package com.BankingBuddy.client_service.service;

import com.BankingBuddy.client_service.model.entity.Account;
import com.BankingBuddy.client_service.model.entity.Client;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Service for sending emails via AWS SES
 * Implements async, non-blocking email sending with retry logic
 */
@Service
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final int MAX_RETRIES = 3;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMMM dd, yyyy");
    
    private final SesClient sesClient;
    private final String sourceEmail;
    
    public EmailService(
            SesClient sesClient,
            @Value("${aws.ses.source-email}") String sourceEmail) {
        this.sesClient = sesClient;
        this.sourceEmail = sourceEmail;
    }
    
    /**
     * Send verification email to client (async, non-blocking)
     * Implements 3-retry logic with exponential backoff (1s, 2s, 4s)
     * Email failure does NOT affect endpoint response
     * 
     * @param client The client to send verification email to
     */
    @Async
    public void sendVerificationEmail(Client client) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < MAX_RETRIES) {
            try {
                attempt++;
                logger.info("Attempting to send verification email to {} (attempt {}/{})", 
                           client.getEmail(), attempt, MAX_RETRIES);
                
                SendEmailRequest emailRequest = buildVerificationEmailRequest(client);
                SendEmailResponse response = sesClient.sendEmail(emailRequest);
                
                logger.info("Successfully sent verification email to {}. Message ID: {}", 
                           client.getEmail(), response.messageId());
                return; // Success - exit method
                
            } catch (SesException e) {
                lastException = e;
                logger.warn("Failed to send verification email to {} (attempt {}/{}): {} (Code: {})",
                           client.getEmail(), attempt, MAX_RETRIES, 
                           e.getMessage(), e.awsErrorDetails().errorCode());
                
                if (attempt < MAX_RETRIES) {
                    // Exponential backoff: 1s, 2s, 4s
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        logger.info("Retrying in {} seconds...", delaySeconds);
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        logger.error("Interrupted while waiting to retry email send", ie);
                        break;
                    }
                }
            } catch (Exception e) {
                lastException = e;
                logger.error("Unexpected error sending verification email to {} (attempt {}/{}): {}",
                            client.getEmail(), attempt, MAX_RETRIES, e.getMessage(), e);
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        // All retries failed - log error but don't throw exception (non-blocking)
        logger.error("Failed to send verification email to {} after {} attempts. Last error: {}",
                    client.getEmail(), MAX_RETRIES, 
                    lastException != null ? lastException.getMessage() : "Unknown error");
        logger.error("Email failure is logged but does not affect the verification operation");
    }
    
    /**
     * Build SES SendEmailRequest for client verification
     * Uses email template from specification
     */
    private SendEmailRequest buildVerificationEmailRequest(Client client) {
        String subject = "Your Banking Buddy Profile is Verified! ✓";
        String bodyText = buildVerificationEmailBody(client);
        
        return SendEmailRequest.builder()
                .source(sourceEmail)
                .destination(Destination.builder()
                        .toAddresses(client.getEmail())
                        .build())
                .message(Message.builder()
                        .subject(Content.builder()
                                .data(subject)
                                .charset("UTF-8")
                                .build())
                        .body(Body.builder()
                                .text(Content.builder()
                                        .data(bodyText)
                                        .charset("UTF-8")
                                        .build())
                                .build())
                        .build())
                .build();
    }
    
    /**
     * Build email body using template from specification
     */
    private String buildVerificationEmailBody(Client client) {
        String verifiedDate = LocalDate.now().format(DATE_FORMATTER);
        
        return String.format(
            "Dear %s %s,\n\n" +
            "Great news! Your Banking Buddy client profile has been successfully verified.\n\n" +
            "Client ID: %s\n" +
            "Verified Date: %s\n\n" +
            "You can now access all banking services available to verified clients.\n\n" +
            "If you have any questions, please contact your agent.\n\n" +
            "Best regards,\n" +
            "Banking Buddy Team",
            client.getFirstName(),
            client.getLastName(),
            client.getClientId(),
            verifiedDate
        );
    }
    
    /**
     * Send client profile creation email (async, non-blocking)
     * Implements 3-retry logic with exponential backoff (1s, 2s, 4s)
     * Email failure does NOT affect endpoint response
     * 
     * @param client The client who was created
     */
    @Async
    public void sendClientCreationEmail(Client client) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < MAX_RETRIES) {
            try {
                attempt++;
                logger.info("Attempting to send creation email to {} (attempt {}/{})", 
                           client.getEmail(), attempt, MAX_RETRIES);
                
                SendEmailRequest emailRequest = buildClientCreationEmailRequest(client);
                SendEmailResponse response = sesClient.sendEmail(emailRequest);
                
                logger.info("Successfully sent creation email to {}. Message ID: {}", 
                           client.getEmail(), response.messageId());
                return; // Success - exit method
                
            } catch (SesException e) {
                lastException = e;
                logger.warn("Failed to send creation email to {} (attempt {}/{}): {} (Code: {})",
                           client.getEmail(), attempt, MAX_RETRIES, 
                           e.getMessage(), e.awsErrorDetails().errorCode());
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        logger.info("Retrying in {} seconds...", delaySeconds);
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        logger.error("Interrupted while waiting to retry email send", ie);
                        break;
                    }
                }
            } catch (Exception e) {
                lastException = e;
                logger.error("Unexpected error sending creation email to {} (attempt {}/{}): {}",
                            client.getEmail(), attempt, MAX_RETRIES, e.getMessage(), e);
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        // All retries failed - log error but don't throw exception (non-blocking)
        logger.error("Failed to send creation email to {} after {} attempts. Last error: {}",
                    client.getEmail(), MAX_RETRIES, 
                    lastException != null ? lastException.getMessage() : "Unknown error");
    }
    
    /**
     * Build SES SendEmailRequest for client creation
     */
    private SendEmailRequest buildClientCreationEmailRequest(Client client) {
        String subject = "Welcome to Banking Buddy - Profile Created Successfully";
        String bodyText = buildClientCreationEmailBody(client);
        
        return SendEmailRequest.builder()
                .source(sourceEmail)
                .destination(Destination.builder()
                        .toAddresses(client.getEmail())
                        .build())
                .message(Message.builder()
                        .subject(Content.builder()
                                .data(subject)
                                .charset("UTF-8")
                                .build())
                        .body(Body.builder()
                                .text(Content.builder()
                                        .data(bodyText)
                                        .charset("UTF-8")
                                        .build())
                                .build())
                        .build())
                .build();
    }
    
    /**
     * Build email body for client creation
     */
    private String buildClientCreationEmailBody(Client client) {
        String creationDate = LocalDate.now().format(DATE_FORMATTER);
        
        return String.format(
            "Dear %s %s,\n\n" +
            "Welcome to Banking Buddy! Your client profile has been successfully created by your agent.\n\n" +
            "Profile Details:\n" +
            "- Client ID: %s\n" +
            "- Created Date: %s\n" +
            "- Email: %s\n" +
            "- Phone: %s\n" +
            "- Agent ID: %s\n\n" +
            "Your profile is currently pending verification. Once verified, you'll have full access to all banking services.\n\n" +
            "If you have any questions, please contact your agent.\n\n" +
            "Best regards,\n" +
            "Banking Buddy Team",
            client.getFirstName(),
            client.getLastName(),
            client.getClientId(),
            creationDate,
            client.getEmail(),
            client.getPhoneNumber(),
            client.getAgentId()
        );
    }
    
    /**
     * Send client profile update email (async, non-blocking)
     * Includes summary of changed fields
     * Implements 3-retry logic with exponential backoff (1s, 2s, 4s)
     * 
     * @param client The updated client
     * @param changes Map of field changes (field -> {old, new})
     */
    @Async
    public void sendClientUpdateEmail(Client client, Map<String, Object> changes) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < MAX_RETRIES) {
            try {
                attempt++;
                logger.info("Attempting to send update email to {} (attempt {}/{})", 
                           client.getEmail(), attempt, MAX_RETRIES);
                
                SendEmailRequest emailRequest = buildClientUpdateEmailRequest(client, changes);
                SendEmailResponse response = sesClient.sendEmail(emailRequest);
                
                logger.info("Successfully sent update email to {}. Message ID: {}", 
                           client.getEmail(), response.messageId());
                return; // Success - exit method
                
            } catch (SesException e) {
                lastException = e;
                logger.warn("Failed to send update email to {} (attempt {}/{}): {} (Code: {})",
                           client.getEmail(), attempt, MAX_RETRIES, 
                           e.getMessage(), e.awsErrorDetails().errorCode());
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        logger.info("Retrying in {} seconds...", delaySeconds);
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        logger.error("Interrupted while waiting to retry email send", ie);
                        break;
                    }
                }
            } catch (Exception e) {
                lastException = e;
                logger.error("Unexpected error sending update email to {} (attempt {}/{}): {}",
                            client.getEmail(), attempt, MAX_RETRIES, e.getMessage(), e);
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        // All retries failed - log error but don't throw exception (non-blocking)
        logger.error("Failed to send update email to {} after {} attempts. Last error: {}",
                    client.getEmail(), MAX_RETRIES, 
                    lastException != null ? lastException.getMessage() : "Unknown error");
    }
    
    /**
     * Build SES SendEmailRequest for client update
     */
    private SendEmailRequest buildClientUpdateEmailRequest(Client client, Map<String, Object> changes) {
        String subject = "Banking Buddy Profile Updated";
        String bodyText = buildClientUpdateEmailBody(client, changes);
        
        return SendEmailRequest.builder()
                .source(sourceEmail)
                .destination(Destination.builder()
                        .toAddresses(client.getEmail())
                        .build())
                .message(Message.builder()
                        .subject(Content.builder()
                                .data(subject)
                                .charset("UTF-8")
                                .build())
                        .body(Body.builder()
                                .text(Content.builder()
                                        .data(bodyText)
                                        .charset("UTF-8")
                                        .build())
                                .build())
                        .build())
                .build();
    }
    
    /**
     * Build email body for client update
     */
    private String buildClientUpdateEmailBody(Client client, Map<String, Object> changes) {
        String updateDate = LocalDate.now().format(DATE_FORMATTER);
        String changesList = formatChangesForEmail(changes);
        
        return String.format(
            "Dear %s %s,\n\n" +
            "Your Banking Buddy client profile has been updated by your agent.\n\n" +
            "Profile Details:\n" +
            "- Client ID: %s\n" +
            "- Updated Date: %s\n\n" +
            "Fields Changed:\n%s\n" +
            "If you did not request these changes or have any questions, please contact your agent immediately.\n\n" +
            "Best regards,\n" +
            "Banking Buddy Team",
            client.getFirstName(),
            client.getLastName(),
            client.getClientId(),
            updateDate,
            changesList
        );
    }
    
    /**
     * Send client profile deletion email (async, non-blocking)
     * Includes warning about cascaded account deletions
     * Implements 3-retry logic with exponential backoff (1s, 2s, 4s)
     * 
     * @param client The deleted client
     * @param deletedAccounts List of accounts that were deleted with the client
     */
    @Async
    public void sendClientDeletionEmail(Client client, List<Account> deletedAccounts) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < MAX_RETRIES) {
            try {
                attempt++;
                logger.info("Attempting to send deletion email to {} (attempt {}/{})", 
                           client.getEmail(), attempt, MAX_RETRIES);
                
                SendEmailRequest emailRequest = buildClientDeletionEmailRequest(client, deletedAccounts);
                SendEmailResponse response = sesClient.sendEmail(emailRequest);
                
                logger.info("Successfully sent deletion email to {}. Message ID: {}", 
                           client.getEmail(), response.messageId());
                return; // Success - exit method
                
            } catch (SesException e) {
                lastException = e;
                logger.warn("Failed to send deletion email to {} (attempt {}/{}): {} (Code: {})",
                           client.getEmail(), attempt, MAX_RETRIES, 
                           e.getMessage(), e.awsErrorDetails().errorCode());
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        logger.info("Retrying in {} seconds...", delaySeconds);
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        logger.error("Interrupted while waiting to retry email send", ie);
                        break;
                    }
                }
            } catch (Exception e) {
                lastException = e;
                logger.error("Unexpected error sending deletion email to {} (attempt {}/{}): {}",
                            client.getEmail(), attempt, MAX_RETRIES, e.getMessage(), e);
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        // All retries failed - log error but don't throw exception (non-blocking)
        logger.error("Failed to send deletion email to {} after {} attempts. Last error: {}",
                    client.getEmail(), MAX_RETRIES, 
                    lastException != null ? lastException.getMessage() : "Unknown error");
    }
    
    /**
     * Build SES SendEmailRequest for client deletion
     */
    private SendEmailRequest buildClientDeletionEmailRequest(Client client, List<Account> deletedAccounts) {
        String subject = "Banking Buddy Profile Deleted";
        String bodyText = buildClientDeletionEmailBody(client, deletedAccounts);
        
        return SendEmailRequest.builder()
                .source(sourceEmail)
                .destination(Destination.builder()
                        .toAddresses(client.getEmail())
                        .build())
                .message(Message.builder()
                        .subject(Content.builder()
                                .data(subject)
                                .charset("UTF-8")
                                .build())
                        .body(Body.builder()
                                .text(Content.builder()
                                        .data(bodyText)
                                        .charset("UTF-8")
                                        .build())
                                .build())
                        .build())
                .build();
    }
    
    /**
     * Build email body for client deletion
     */
    private String buildClientDeletionEmailBody(Client client, List<Account> deletedAccounts) {
        String deletionDate = LocalDate.now().format(DATE_FORMATTER);
        int accountCount = deletedAccounts.size();
        
        StringBuilder body = new StringBuilder();
        body.append(String.format(
            "Dear %s %s,\n\n" +
            "Your Banking Buddy client profile has been deleted by your agent.\n\n" +
            "Profile Details:\n" +
            "- Client ID: %s\n" +
            "- Deletion Date: %s\n" +
            "- Associated Accounts Deleted: %d\n",
            client.getFirstName(),
            client.getLastName(),
            client.getClientId(),
            deletionDate,
            accountCount
        ));
        
        // Include account IDs if any accounts were deleted
        if (accountCount > 0) {
            body.append("\nDeleted Account IDs:\n");
            for (Account account : deletedAccounts) {
                body.append(String.format("- %s\n", account.getAccountId()));
            }
        }
        
        body.append("\nAll your associated accounts have been closed. This action is permanent and cannot be undone.\n\n");
        body.append("If you did not request this deletion or have any questions, please contact your agent immediately.\n\n");
        body.append("Best regards,\n");
        body.append("Banking Buddy Team");
        
        return body.toString();
    }
    
    /**
     * Send account deletion email (async, non-blocking)
     * Notifies client of account closure
     * Implements 3-retry logic with exponential backoff (1s, 2s, 4s)
     * 
     * @param client The client who owns the account
     * @param account The deleted account
     */
    @Async
    public void sendAccountDeletionEmail(Client client, Account account) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < MAX_RETRIES) {
            try {
                attempt++;
                logger.info("Attempting to send account deletion email to {} (attempt {}/{})", 
                           client.getEmail(), attempt, MAX_RETRIES);
                
                SendEmailRequest emailRequest = buildAccountDeletionEmailRequest(client, account);
                SendEmailResponse response = sesClient.sendEmail(emailRequest);
                
                logger.info("Successfully sent account deletion email to {}. Message ID: {}", 
                           client.getEmail(), response.messageId());
                return; // Success - exit method
                
            } catch (SesException e) {
                lastException = e;
                logger.warn("Failed to send account deletion email to {} (attempt {}/{}): {} (Code: {})",
                           client.getEmail(), attempt, MAX_RETRIES, 
                           e.getMessage(), e.awsErrorDetails().errorCode());
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        logger.info("Retrying in {} seconds...", delaySeconds);
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        logger.error("Interrupted while waiting to retry email send", ie);
                        break;
                    }
                }
            } catch (Exception e) {
                lastException = e;
                logger.error("Unexpected error sending account deletion email to {} (attempt {}/{}): {}",
                            client.getEmail(), attempt, MAX_RETRIES, e.getMessage(), e);
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        // All retries failed - log error but don't throw exception (non-blocking)
        logger.error("Failed to send account deletion email to {} after {} attempts. Last error: {}",
                    client.getEmail(), MAX_RETRIES, 
                    lastException != null ? lastException.getMessage() : "Unknown error");
    }
    
    /**
     * Build SES SendEmailRequest for account deletion
     */
    private SendEmailRequest buildAccountDeletionEmailRequest(Client client, Account account) {
        String subject = "Banking Buddy Account Closed";
        String bodyText = buildAccountDeletionEmailBody(client, account);
        
        return SendEmailRequest.builder()
                .source(sourceEmail)
                .destination(Destination.builder()
                        .toAddresses(client.getEmail())
                        .build())
                .message(Message.builder()
                        .subject(Content.builder()
                                .data(subject)
                                .charset("UTF-8")
                                .build())
                        .body(Body.builder()
                                .text(Content.builder()
                                        .data(bodyText)
                                        .charset("UTF-8")
                                        .build())
                                .build())
                        .build())
                .build();
    }
    
    /**
     * Build email body for account deletion
     */
    private String buildAccountDeletionEmailBody(Client client, Account account) {
        String closureDate = LocalDate.now().format(DATE_FORMATTER);
        
        return String.format(
            "Dear %s %s,\n\n" +
            "One of your Banking Buddy accounts has been closed by your agent.\n\n" +
            "Account Details:\n" +
            "- Account ID: %s\n" +
            "- Account Type: %s\n" +
            "- Closure Date: %s\n" +
            "- Final Balance: %.2f %s\n\n" +
            "Client ID: %s\n\n" +
            "This action is permanent and cannot be undone.\n\n" +
            "If you did not request this closure or have any questions, please contact your agent immediately.\n\n" +
            "Best regards,\n" +
            "Banking Buddy Team",
            client.getFirstName(),
            client.getLastName(),
            account.getAccountId(),
            account.getAccountType().getValue(),
            closureDate,
            account.getBalance(),
            account.getCurrency(),
            client.getClientId()
        );
    }
    
    /**
     * Send account creation email (async, non-blocking)
     * Notifies client of new account opening
     * Implements 3-retry logic with exponential backoff (1s, 2s, 4s)
     * 
     * @param client The client who owns the account
     * @param account The newly created account
     */
    @Async
    public void sendAccountCreationEmail(Client client, Account account) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < MAX_RETRIES) {
            try {
                attempt++;
                logger.info("Attempting to send account creation email to {} (attempt {}/{})", 
                           client.getEmail(), attempt, MAX_RETRIES);
                
                SendEmailRequest emailRequest = buildAccountCreationEmailRequest(client, account);
                SendEmailResponse response = sesClient.sendEmail(emailRequest);
                
                logger.info("Successfully sent account creation email to {}. Message ID: {}", 
                           client.getEmail(), response.messageId());
                return; // Success - exit method
                
            } catch (SesException e) {
                lastException = e;
                logger.warn("Failed to send account creation email to {} (attempt {}/{}): {} (Code: {})",
                           client.getEmail(), attempt, MAX_RETRIES, 
                           e.getMessage(), e.awsErrorDetails().errorCode());
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        logger.info("Retrying in {} seconds...", delaySeconds);
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        logger.error("Interrupted while waiting to retry email send", ie);
                        break;
                    }
                }
            } catch (Exception e) {
                lastException = e;
                logger.error("Unexpected error sending account creation email to {} (attempt {}/{}): {}",
                            client.getEmail(), attempt, MAX_RETRIES, e.getMessage(), e);
                
                if (attempt < MAX_RETRIES) {
                    long delaySeconds = (long) Math.pow(2, attempt - 1);
                    try {
                        Thread.sleep(delaySeconds * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        // All retries failed - log error but don't throw exception (non-blocking)
        logger.error("Failed to send account creation email to {} after {} attempts. Last error: {}",
                    client.getEmail(), MAX_RETRIES, 
                    lastException != null ? lastException.getMessage() : "Unknown error");
    }
    
    /**
     * Build SES SendEmailRequest for account creation
     */
    private SendEmailRequest buildAccountCreationEmailRequest(Client client, Account account) {
        String subject = "New Banking Buddy Account Opened";
        String bodyText = buildAccountCreationEmailBody(client, account);
        
        return SendEmailRequest.builder()
                .source(sourceEmail)
                .destination(Destination.builder()
                        .toAddresses(client.getEmail())
                        .build())
                .message(Message.builder()
                        .subject(Content.builder()
                                .data(subject)
                                .charset("UTF-8")
                                .build())
                        .body(Body.builder()
                                .text(Content.builder()
                                        .data(bodyText)
                                        .charset("UTF-8")
                                        .build())
                                .build())
                        .build())
                .build();
    }
    
    /**
     * Build email body for account creation
     */
    private String buildAccountCreationEmailBody(Client client, Account account) {
        String openingDate = account.getOpeningDate().format(DATE_FORMATTER);
        
        return String.format(
            "Dear %s %s,\n\n" +
            "Congratulations! A new Banking Buddy account has been opened for you by your agent.\n\n" +
            "Account Details:\n" +
            "- Account ID: %s\n" +
            "- Account Type: %s\n" +
            "- Opening Date: %s\n" +
            "- Initial Deposit: %.2f %s\n" +
            "- Account Status: %s\n" +
            "- Branch ID: %s\n\n" +
            "Client ID: %s\n\n" +
            "You can now start using your new account for banking transactions.\n\n" +
            "If you have any questions, please contact your agent.\n\n" +
            "Best regards,\n" +
            "Banking Buddy Team",
            client.getFirstName(),
            client.getLastName(),
            account.getAccountId(),
            account.getAccountType().getValue(),
            openingDate,
            account.getInitialDeposit(),
            account.getCurrency(),
            account.getAccountStatus().getValue(),
            account.getBranchId(),
            client.getClientId()
        );
    }
    
    /**
     * Format changes map into human-readable list for email
     * 
     * @param changes Map of field changes (field -> {old, new})
     * @return Formatted string list
     */
    private String formatChangesForEmail(Map<String, Object> changes) {
        StringBuilder changesList = new StringBuilder();
        
        for (Map.Entry<String, Object> entry : changes.entrySet()) {
            String fieldName = formatFieldName(entry.getKey());
            @SuppressWarnings("unchecked")
            Map<String, String> fieldChange = (Map<String, String>) entry.getValue();
            
            changesList.append("- ")
                       .append(fieldName)
                       .append(": \"")
                       .append(fieldChange.get("old"))
                       .append("\" → \"")
                       .append(fieldChange.get("new"))
                       .append("\"\n");
        }
        
        return changesList.toString();
    }
    
    /**
     * Convert camelCase to Title Case
     * Example: "firstName" → "First Name"
     */
    private String formatFieldName(String camelCase) {
        String withSpaces = camelCase.replaceAll("([A-Z])", " $1");
        return withSpaces.substring(0, 1).toUpperCase() + withSpaces.substring(1);
    }
}
