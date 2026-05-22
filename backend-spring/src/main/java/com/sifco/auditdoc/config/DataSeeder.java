package com.sifco.auditdoc.config;

import com.sifco.auditdoc.entity.Policy;
import com.sifco.auditdoc.entity.User;
import com.sifco.auditdoc.repository.PolicyRepository;
import com.sifco.auditdoc.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PolicyRepository policyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        seedAdminUser();
        seedSampleUsers();
        seedDefaultPolicy();
    }

    private void seedAdminUser() {
        if (!userRepository.existsByEmail("admin@audit.local")) {
            User admin = User.builder()
                    .fullName("System Administrator")
                    .email("admin@audit.local")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role(User.Role.ADMINISTRATOR)
                    .department("IT")
                    .emailVerified(true)
                    .active(true)
                    .employeeId("EMP001")
                    .build();
            userRepository.save(admin);
            log.info("✓ Admin user created → admin@audit.local / admin123");
        }
    }

    private void seedSampleUsers() {
        if (!userRepository.existsByEmail("auditor@audit.local")) {
            userRepository.save(User.builder()
                    .fullName("Jane Auditor")
                    .email("auditor@audit.local")
                    .passwordHash(passwordEncoder.encode("auditor123"))
                    .role(User.Role.AUDITOR)
                    .department("Audit")
                    .emailVerified(true)
                    .active(true)
                    .employeeId("EMP002")
                    .build());
            log.info("✓ Auditor user created → auditor@audit.local / auditor123");
        }

        if (!userRepository.existsByEmail("manager@audit.local")) {
            userRepository.save(User.builder()
                    .fullName("John Manager")
                    .email("manager@audit.local")
                    .passwordHash(passwordEncoder.encode("manager123"))
                    .role(User.Role.DOCUMENT_MANAGER)
                    .department("Operations")
                    .emailVerified(true)
                    .active(true)
                    .employeeId("EMP003")
                    .build());
            log.info("✓ Document Manager created → manager@audit.local / manager123");
        }

        if (!userRepository.existsByEmail("viewer@audit.local")) {
            userRepository.save(User.builder()
                    .fullName("Alice Viewer")
                    .email("viewer@audit.local")
                    .passwordHash(passwordEncoder.encode("viewer123"))
                    .role(User.Role.VIEWER)
                    .department("Finance")
                    .emailVerified(true)
                    .active(true)
                    .employeeId("EMP004")
                    .build());
            log.info("✓ Viewer user created → viewer@audit.local / viewer123");
        }
    }

    private void seedDefaultPolicy() {
        if (!policyRepository.existsByName("Default Data Protection Policy")) {
            Policy policy = Policy.builder()
                    .name("Default Data Protection Policy")
                    .description("Standard data protection and compliance policy")
                    .policyType(Policy.PolicyType.ORGANIZATIONAL)
                    .version("1.0")
                    .status(Policy.PolicyStatus.ACTIVE)
                    .regulatoryFrameworks("[\"GDPR\",\"ISO27001\"]")
                    .rules("[{\"id\":\"rule_1\",\"name\":\"Document Classification Required\"," +
                           "\"ruleType\":\"mandatory\",\"severity\":\"high\"}]")
                    .effectiveDate(LocalDateTime.now())
                    .build();
            policyRepository.save(policy);
            log.info("✓ Default policy created");
        }
    }
}
