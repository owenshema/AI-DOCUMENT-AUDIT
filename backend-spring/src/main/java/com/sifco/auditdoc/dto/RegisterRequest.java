package com.sifco.auditdoc.dto;

import com.sifco.auditdoc.entity.User;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 200)
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be 6-100 characters")
    private String password;

    private String phone;
    private String employeeId;

    @NotNull(message = "Role is required")
    private User.Role role;

    @NotBlank(message = "Department is required")
    private String department;
}
