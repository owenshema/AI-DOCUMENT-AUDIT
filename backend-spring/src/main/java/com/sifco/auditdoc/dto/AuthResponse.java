package com.sifco.auditdoc.dto;

import com.sifco.auditdoc.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String tokenType = "Bearer";
    private UserDto user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDto {
        private String id;
        private String fullName;
        private String email;
        private String phone;
        private String employeeId;
        private User.Role role;
        private String department;
        private boolean emailVerified;
        private boolean mfaEnabled;
        private boolean active;
    }
}
