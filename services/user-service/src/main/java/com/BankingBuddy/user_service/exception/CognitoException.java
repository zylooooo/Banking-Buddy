package com.BankingBuddy.user_service.exception;

public class CognitoException extends RuntimeException {
    public CognitoException(String message, Throwable cause) {
        super(message, cause);
    }
}
