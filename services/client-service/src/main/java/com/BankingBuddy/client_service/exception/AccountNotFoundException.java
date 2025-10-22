package com.BankingBuddy.client_service.exception;

/**
 * Exception thrown when an account is not found
 * HTTP Status: 404 NOT FOUND
 */
public class AccountNotFoundException extends RuntimeException {
    public AccountNotFoundException(String message) {
        super(message);
    }
}
