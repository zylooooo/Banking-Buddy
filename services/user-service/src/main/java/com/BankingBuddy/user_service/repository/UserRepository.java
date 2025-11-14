package com.BankingBuddy.user_service.repository;

import com.BankingBuddy.user_service.model.entity.User;
import com.BankingBuddy.user_service.security.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    List<User> findByRole(UserRole role);

    List<User> findByStatus(String status);

    boolean existsByEmail(String email);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.status = 'active'")
    long countActiveUsersByRole(@Param("role") UserRole role);

    // Pagination methods for get all users, one for admins and one for root admins
    Page<User> findByRoleAndCreatedByOrderByCreatedAtDesc(UserRole role, String createdBy, Pageable pageable);
    
    Page<User> findByRoleInOrderByCreatedAtDesc(List<UserRole> roles, Pageable pageable);
}
