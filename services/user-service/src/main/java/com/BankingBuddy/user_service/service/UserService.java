package com.BankingBuddy.user_service.service;

import com.BankingBuddy.user_service.model.dto.CreateUserRequest;
import com.BankingBuddy.user_service.model.dto.UpdateUserRequest;
import com.BankingBuddy.user_service.model.dto.UserDTO;
import com.BankingBuddy.user_service.model.entity.User;
import com.BankingBuddy.user_service.repository.UserRepository;
import com.BankingBuddy.user_service.security.UserContext;
import com.BankingBuddy.user_service.security.UserRole;
import com.BankingBuddy.user_service.security.UserStatus;
import com.BankingBuddy.user_service.exception.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Comparator;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AssociateSoftwareTokenResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.VerifySoftwareTokenResponse;

@Service
@Slf4j
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final CognitoService cognitoService;

    public UserService(UserRepository userRepository, CognitoService cognitoService) {
        this.userRepository = userRepository;
        this.cognitoService = cognitoService;
    }

    private UserDTO mapToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .status(user.getStatus().name())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public UserDTO createUser(CreateUserRequest request, UserContext currentUser) {
        // Authorization check
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.ROOT_ADMIN) {
            throw new ForbiddenException("Only admins can create new users");
        }

        // Admins can only create agents
        if (currentUser.getRole() == UserRole.ADMIN && request.getRole() != UserRole.AGENT) {
            throw new ForbiddenException("Admins can only create agents");
        }

        // Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("User with email " + request.getEmail() + " already exists");
        }

        // Create user in Cognito first
        String cognitoUserId = cognitoService.createUser(
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getRole());

        // Create user in local database
        User user = User.builder()
                .id(cognitoUserId)
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(request.getRole())
                .status(UserStatus.PENDING)
                .createdBy(currentUser.getUserId())
                .updatedBy(currentUser.getUserId())
                .build();

        user = userRepository.save(user);
        log.info("Created user in database: {} by {}", user.getEmail(), currentUser.getEmail());

        return mapToDTO(user);
    }

    public UserDTO updateUser(String userId, UpdateUserRequest request, UserContext currentUser) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Authorization logic
        if (request.getRole() != null) {
            // No one can change anyone to root admin
            if (request.getRole() == UserRole.ROOT_ADMIN) {
                throw new ForbiddenException("Root admin role cannot be changed");
            }
            // Users cannot change their own role
            if (currentUser.getUserId().equals(userId)) {
                throw new ForbiddenException("Users cannot change their own role");
            }
            // Admins can only change other agents role
            if (currentUser.getRole() == UserRole.ADMIN && user.getRole() != UserRole.AGENT) {
                throw new ForbiddenException("Admins can only change other agents role");
            }
        }

        if (currentUser.getRole() == UserRole.AGENT) {
            // Agents can only update their own profile
            if (!currentUser.getUserId().equals(userId)) {
                throw new ForbiddenException("Agents can only update their own profile");
            }
        } else if (currentUser.getRole() == UserRole.ADMIN) {
            // Admins can only update their own profile and other agent's profile
            if (user.getRole() == UserRole.ADMIN && !currentUser.getUserId().equals(userId)) {
                throw new ForbiddenException("Admins can only update their own profile and other agent's profile");
            }
        } else if (currentUser.getRole() == UserRole.ROOT_ADMIN) {
            // Root admins can update all user profiles and roles except root admin
            if (user.getRole() == UserRole.ROOT_ADMIN) {
                throw new ForbiddenException(
                        "Root admins can only update all user profiles and roles except root admin");
            }
        }

        // Update Cognito first
        cognitoService.updateUserAttributes(userId,
                request.getFirstName(),
                request.getLastName(),
                request.getRole());

        // Update local database
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        user.setUpdatedBy(currentUser.getUserId());

        user = userRepository.save(user);
        log.info("Updated user: {} by {}", user.getEmail(), currentUser.getEmail());

        return mapToDTO(user);
    }

    public void disableUser(String userId, UserContext currentUser) {
        // Authorization check
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.ROOT_ADMIN) {
            throw new ForbiddenException("Only admins can disable users");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Prevent disabling root admin
        if (user.getRole() == UserRole.ROOT_ADMIN) {
            throw new ForbiddenException("Cannot disable root administrator");
        }

        // Cannot disable self
        if (currentUser.getUserId().equals(user.getId())) {
            throw new ForbiddenException("Cannot disable yourself");
        }

        // Admins cannot disable other admins
        if (currentUser.getRole() == UserRole.ADMIN && user.getRole() != UserRole.AGENT) {
            throw new ForbiddenException("Admins cannot disable other admins");
        }

        // Disable in Cognito
        cognitoService.disableUser(userId);

        // Update local database
        user.setStatus(UserStatus.DISABLED);
        user.setUpdatedBy(currentUser.getUserId());
        userRepository.save(user);

        log.info("Disabled user: {} by {}", user.getEmail(), currentUser.getEmail());
    }

    public void enableUser(String userId, UserContext currentUser) {
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.ROOT_ADMIN) {
            throw new ForbiddenException("Only admins can enable users");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Cannot enable self
        if (currentUser.getUserId().equals(userId)) {
            throw new ForbiddenException("Cannot enable yourself");
        }

        // Admins cannot enable other admins
        if (currentUser.getRole() == UserRole.ADMIN && user.getRole() != UserRole.AGENT) {
            throw new ForbiddenException("Admins cannot enable other admins");
        }

        cognitoService.enableUser(userId);

        user.setStatus(UserStatus.ACTIVE);
        user.setUpdatedBy(currentUser.getUserId());
        userRepository.save(user);

        log.info("Enabled user: {} by {}", user.getEmail(), currentUser.getEmail());
    }

    public void resetPassword(String userId, UserContext currentUser) {
        if (!currentUser.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only reset your own password");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        cognitoService.resetPassword(userId);
        log.info("Reset password for user: {} by {}", user.getEmail(), currentUser.getEmail());
    }

    public UserDTO getUserById(String userId, UserContext currentUser) {
        // Agents can only view their own profile
        if (currentUser.getRole() == UserRole.AGENT && !currentUser.getUserId().equals(userId)) {
            throw new ForbiddenException("Agents can only view their own profile");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        return mapToDTO(user);
    }

    public List<UserDTO> getAllUsers(UserContext currentUser) {
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.ROOT_ADMIN) {
            throw new ForbiddenException("Only admins can view all users");
        }

        // Get all users from the database
        List<User> allUsers = userRepository.findAll();

        // If the user is an admin, return all agents that were created by the admin
        if (currentUser.getRole() == UserRole.ADMIN) {
            return allUsers.stream()
                    .filter(user -> user.getRole() == UserRole.AGENT)
                    .filter(user -> user.getCreatedBy().equals(currentUser.getUserId()))
                    .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                    .map(this::mapToDTO)
                    .toList();
        }

        // Return all admins and agents if user is root admin
        return allUsers.stream()
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .map(this::mapToDTO)
                .toList();
    }

    public void setUpMFAForUser(String userId, UserContext currentUser) {
        // Only allow users themselves to finish onboarding
        if (!currentUser.getUserId().equals(userId)) {
            throw new ForbiddenException("Only users themselves can set up MFA");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        if (user.getStatus().equals(UserStatus.DISABLED)) {
            throw new ForbiddenException("Cannot set up MFA for deleted users");
        }

        // NOTE: At this point, TOTP should already be verified and set as preferred 
        // via frontend Amplify SDK (updateMFAPreference). The frontend handles all MFA setup.
        // This backend method only marks the user as ACTIVE (onboarding complete).
        
        // Optionally cleanup SMS MFA if user previously had it (for migration scenarios)
        try {
            cognitoService.removeSMSMFAPreference(userId);
            log.debug("Cleaned up SMS MFA preference for user: {}", user.getEmail());
        } catch (Exception e) {
            log.debug("No SMS MFA to clean up for user {}: {}", userId, e.getMessage());
            // Not an error - user may not have had SMS MFA
        }

        // Update user's status
        user.setStatus(UserStatus.ACTIVE);
        user.setUpdatedBy(currentUser.getUserId());
        userRepository.save(user);

        log.info("Completed MFA setup and activated user: {}", user.getEmail());
    }
    
    /**
     * Associate software token (TOTP) for the current user.
     * Returns secret code and session token for QR code generation.
     */
    public AssociateSoftwareTokenResponse associateTOTP(String accessToken, UserContext currentUser) {
        // Only allow users to set up TOTP for themselves
        // Note: We can't validate userId from access token directly, 
        // but Cognito will reject invalid access tokens
        return cognitoService.associateSoftwareToken(accessToken);
    }
    
    /**
     * Verify software token (TOTP) code for the current user.
     */
    public VerifySoftwareTokenResponse verifyTOTP(String accessToken, String totpCode, UserContext currentUser) {
        // Only allow users to verify TOTP for themselves
        // Note: We can't validate userId from access token directly,
        // but Cognito will reject invalid access tokens
        return cognitoService.verifySoftwareToken(accessToken, totpCode);
    }

}
