package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.exception.BadRequestException;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<User> getAll(int page, int size) {
        return userRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @Transactional(readOnly = true)
    public User getById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    @Transactional(readOnly = true)
    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    @Transactional
    public User update(String id, User updates) {
        User existing = getById(id);
        if (updates.getFullName() != null) existing.setFullName(updates.getFullName());
        if (updates.getPhone() != null) existing.setPhone(updates.getPhone());
        if (updates.getDepartment() != null) existing.setDepartment(updates.getDepartment());
        if (updates.getRole() != null) existing.setRole(updates.getRole());
        return userRepository.save(existing);
    }

    @Transactional
    public User changePassword(String id, String currentPassword, String newPassword) {
        User user = getById(id);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setLoginAttempts(0);
        return userRepository.save(user);
    }

    @Transactional
    public void deactivate(String id) {
        User user = getById(id);
        user.setActive(false);
        userRepository.save(user);
    }
}
