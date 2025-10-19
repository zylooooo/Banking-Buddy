package com.BankingBuddy.user_service.service;

import com.BankingBuddy.user_service.security.UserRole;
import com.BankingBuddy.user_service.exception.CognitoException;
import com.BankingBuddy.user_service.exception.UserAlreadyExistsException;
import com.BankingBuddy.user_service.config.AwsProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class CognitoService {
    
    private final CognitoIdentityProviderClient cognitoClient;
    private final AwsProperties awsProperties;
    
    public CognitoService(CognitoIdentityProviderClient cognitoClient, AwsProperties awsProperties) {
        this.cognitoClient = cognitoClient;
        this.awsProperties = awsProperties;
    }
    
    // Create a new user in AWS Cognito
    public String createUser(String email, String firstName, String lastName, UserRole role) {
        try {
            AdminCreateUserRequest request = AdminCreateUserRequest.builder()
                .userPoolId(awsProperties.getCognito().getUserPoolId())
                .username(email)
                .userAttributes(
                    AttributeType.builder().name("email").value(email).build(),
                    AttributeType.builder().name("email_verified").value("true").build(),
                    AttributeType.builder().name("given_name").value(firstName).build(),
                    AttributeType.builder().name("family_name").value(lastName).build(),
                    AttributeType.builder().name("custom:role").value(role.name().toLowerCase()).build()
                )
                .desiredDeliveryMediums(DeliveryMediumType.EMAIL)
                .build();
            
            AdminCreateUserResponse response = cognitoClient.adminCreateUser(request);
            String userId = response.user().attributes().stream()
                .filter(attr -> "sub".equals(attr.name()))
                .map(AttributeType::value)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Failed to get user ID from Cognito"));
            
            log.info("Created Cognito user: {} with ID: {}", email, userId);
            return userId;
            
        } catch (UsernameExistsException e) {
            log.error("User already exists in Cognito: {}", email);
            throw new UserAlreadyExistsException("User with email " + email + " already exists");
        } catch (Exception e) {
            log.error("Failed to create user in Cognito: {}", email, e);
            throw new CognitoException("Failed to create user in Cognito", e);
        }
    }
    
    // Disable a user in AWS Cognito
    public void disableUser(String userId) {
        try {
            AdminDisableUserRequest request = AdminDisableUserRequest.builder()
                .userPoolId(awsProperties.getCognito().getUserPoolId())
                .username(userId)
                .build();
            
            cognitoClient.adminDisableUser(request);
            log.info("Disabled Cognito user: {}", userId);
            
        } catch (Exception e) {
            log.error("Failed to disable user in Cognito: {}", userId, e);
            throw new CognitoException("Failed to disable user in Cognito", e);
        }
    }
    
    public void enableUser(String userId) {
        try {
            AdminEnableUserRequest request = AdminEnableUserRequest.builder()
                .userPoolId(awsProperties.getCognito().getUserPoolId())
                .username(userId)
                .build();
            
            cognitoClient.adminEnableUser(request);
            log.info("Enabled Cognito user: {}", userId);
            
        } catch (Exception e) {
            log.error("Failed to enable user in Cognito: {}", userId, e);
            throw new CognitoException("Failed to enable user in Cognito", e);
        }
    }
    
    public void updateUserAttributes(String userId, String firstName, String lastName, UserRole role) {
        try {
            List<AttributeType> attributes = new ArrayList<>();
            
            if (firstName != null) {
                attributes.add(AttributeType.builder().name("given_name").value(firstName).build());
            }
            if (lastName != null) {
                attributes.add(AttributeType.builder().name("family_name").value(lastName).build());
            }
            if (role != null) {
                attributes.add(AttributeType.builder().name("custom:role").value(role.name().toLowerCase()).build());
            }
            
            AdminUpdateUserAttributesRequest request = AdminUpdateUserAttributesRequest.builder()
                .userPoolId(awsProperties.getCognito().getUserPoolId())
                .username(userId)
                .userAttributes(attributes)
                .build();
            
            cognitoClient.adminUpdateUserAttributes(request);
            log.info("Updated Cognito user attributes: {}", userId);
            
        } catch (Exception e) {
            log.error("Failed to update user attributes in Cognito: {}", userId, e);
            throw new CognitoException("Failed to update user in Cognito", e);
        }
    }
    
    public void resetPassword(String userId) {
        try {
            AdminResetUserPasswordRequest request = AdminResetUserPasswordRequest.builder()
                .userPoolId(awsProperties.getCognito().getUserPoolId())
                .username(userId)
                .build();
            
            cognitoClient.adminResetUserPassword(request);
            log.info("Reset password for Cognito user: {}", userId);
            
        } catch (Exception e) {
            log.error("Failed to reset password in Cognito: {}", userId, e);
            throw new CognitoException("Failed to reset password in Cognito", e);
        }
    }
}
