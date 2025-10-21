package com.BankingBuddy.client_service.service;

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
}
