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

import java.util.List;

@RestController
@RequestMapping("/api/users")
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
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers(HttpServletRequest httpRequest) {
        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");
        List<UserDTO> users = userService.getAllUsers(currentUser);
        
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

    @PostMapping("/{userId}/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyUserEmail(
        @PathVariable String userId,
        HttpServletRequest httpRequest
    ) {
        UserContext currentUser = (UserContext) httpRequest.getAttribute("userContext");

        try {
            userService.verifyUserEmail(userId, currentUser);
            return ResponseEntity.ok(ApiResponse.success(null, "Email verified successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(e.getMessage()));
        }
    }
}
