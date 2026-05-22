package com.sifco.auditdoc.service;

import com.sifco.auditdoc.dto.AuthResponse;
import com.sifco.auditdoc.dto.LoginRequest;
import com.sifco.auditdoc.dto.RegisterRequest;
import com.sifco.auditdoc.entity.AuditLog;
import com.sifco.auditdoc.entity.User;
import com.sifco.auditdoc.exception.BadRequestException;
import com.sifco.auditdoc.repository.AuditLogRepository;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {
        // Check account lockout
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (user.getLockUntil() != null && user.getLockUntil().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Account locked. Try again after " + user.getLockUntil());
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

            String token = tokenProvider.generateToken(authentication);

            // Reset login attempts on success
            user.setLoginAttempts(0);
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            // Audit log
            saveAuditLog(user.getId(), user.getEmail(), null, AuditLog.Action.LOGIN,
                    "Successful login", ipAddress, true);

            return buildAuthResponse(token, user);

        } catch (AuthenticationException ex) {
            // Increment failed attempts
            user.setLoginAttempts(user.getLoginAttempts() + 1);
            if (user.getLoginAttempts() >= 5) {
                user.setLockUntil(LocalDateTime.now().plusMinutes(15));
                log.warn("Account locked for user: {}", user.getEmail());
            }
            userRepository.save(user);
            saveAuditLog(user.getId(), user.getEmail(), null, AuditLog.Action.FAILED_LOGIN,
                    "Failed login attempt", ipAddress, false);
            throw new BadRequestException("Invalid email or password");
        }
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }
        if (request.getEmployeeId() != null &&
                userRepository.existsByEmployeeId(request.getEmployeeId())) {
            throw new BadRequestException("Employee ID already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .employeeId(request.getEmployeeId())
                .role(request.getRole() != null ? request.getRole() : User.Role.VIEWER)
                .department(request.getDepartment())
                .emailVerified(true) // auto-verify for now
                .active(true)
                .build();

        userRepository.save(user);

        String token = tokenProvider.generateTokenFromUsername(user.getEmail());
        saveAuditLog(user.getId(), user.getEmail(), null, AuditLog.Action.REGISTER,
                "New user registered", null, true);

        return buildAuthResponse(token, user);
    }

    private AuthResponse buildAuthResponse(String token, User user) {
        AuthResponse.UserDto userDto = AuthResponse.UserDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .employeeId(user.getEmployeeId())
                .role(user.getRole())
                .department(user.getDepartment())
                .emailVerified(user.isEmailVerified())
                .mfaEnabled(user.isMfaEnabled())
                .active(user.isActive())
                .build();

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(userDto)
                .build();
    }

    private void saveAuditLog(String userId, String email, String documentId,
                               AuditLog.Action action, String description,
                               String ipAddress, boolean success) {
        try {
            AuditLog log = AuditLog.builder()
                    .userId(userId)
                    .userEmail(email)
                    .documentId(documentId)
                    .action(action)
                    .description(description)
                    .ipAddress(ipAddress)
                    .success(success)
                    .severity(success ? "INFO" : "WARNING")
                    .build();
            auditLogRepository.save(log);
        } catch (Exception e) {
            // Don't fail the main operation due to audit log failure
        }
    }
}
