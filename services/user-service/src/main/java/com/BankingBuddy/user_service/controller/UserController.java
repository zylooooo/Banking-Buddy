package com.BankingBuddy.user_service.controller;

import com.BankingBuddy.user_service.model.dto.*;
import com.BankingBuddy.user_service.security.UserContext;
import com.BankingBuddy.user_service.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AssociateSoftwareTokenResponse;

@RestController
@RequestMapping("/api/v1/users")
@Slf4j
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserDTO>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {

        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        UserDTO user = userService.createUser(request, currentUser);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(user, "User created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageDTO<UserDTO>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int limit,
            HttpServletRequest httpRequest) {

        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");

        // Validate limit (max 100 to prevent abuse, but reasonable for user lists)
        if (limit < 0 || limit > 10) {
            log.warn("User {} provided invalid limit: {}, defaulting to 10", currentUser.getUserId(), limit);
            limit = 10;
        }

        PageDTO<UserDTO> users = userService.getAllUsers(currentUser, page, limit);

        return ResponseEntity.ok(ApiResponse.success(users, "Users retrieved successfully"));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(
            @PathVariable String userId,
            HttpServletRequest httpRequest) {

        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        UserDTO user = userService.getUserById(userId, currentUser);

        return ResponseEntity.ok(ApiResponse.success(user, "User retrieved successfully"));
    }

    @PatchMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserDTO>> updateUser(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRequest request,
            HttpServletRequest httpRequest) {

        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        UserDTO user = userService.updateUser(userId, request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(user, "User updated successfully"));
    }

    @PatchMapping("/{userId}/disable")
    public ResponseEntity<ApiResponse<Void>> disableUser(
            @PathVariable String userId,
            HttpServletRequest httpRequest) {

        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        userService.disableUser(userId, currentUser);

        return ResponseEntity.ok(ApiResponse.success(null, "User disabled successfully"));
    }

    @PatchMapping("/{userId}/enable")
    public ResponseEntity<ApiResponse<Void>> enableUser(
            @PathVariable String userId,
            HttpServletRequest httpRequest) {

        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        userService.enableUser(userId, currentUser);

        return ResponseEntity.ok(ApiResponse.success(null, "User enabled successfully"));
    }

    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable String userId,
            HttpServletRequest httpRequest) {

        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        userService.resetPassword(userId, currentUser);

        return ResponseEntity.ok(ApiResponse.success(null, "Password reset email sent"));
    }

    @PatchMapping("/{userId}/MFA")
    public ResponseEntity<ApiResponse<Void>> setUpMFAForUser(
            @PathVariable String userId,
            HttpServletRequest httpRequest) {
        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");

        try {
            userService.setUpMFAForUser(userId, currentUser);
            return ResponseEntity.ok(ApiResponse.success(null, "User onboarded successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/totp/associate")
    public ResponseEntity<ApiResponse<Map<String, String>>> associateTOTP(
            @Valid @RequestBody AssociateTOTPRequest request,
            HttpServletRequest httpRequest) {
        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");

        try {
            AssociateSoftwareTokenResponse response = userService.associateTOTP(
                    request.getAccessToken(),
                    currentUser);

            // Generate QR code URI from secret
            String secretCode = response.secretCode();
            String issuer = "Banking Buddy";
            String accountName = currentUser.getEmail();
            String qrCodeUri = String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s",
                    issuer, accountName, secretCode, issuer);

            Map<String, String> result = Map.of(
                    "secretCode", secretCode,
                    "qrCodeUri", qrCodeUri);

            return ResponseEntity.ok(ApiResponse.success(result, "TOTP associated successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/totp/verify")
    public ResponseEntity<ApiResponse<Void>> verifyTOTP(
            @Valid @RequestBody VerifyTOTPRequest request,
            HttpServletRequest httpRequest) {
        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");

        try {
            userService.verifyTOTP(
                    request.getAccessToken(),
                    request.getTotpCode(),
                    currentUser);

            return ResponseEntity.ok(ApiResponse.success(null, "TOTP verified successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}
