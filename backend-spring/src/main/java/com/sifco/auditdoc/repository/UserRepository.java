package com.sifco.auditdoc.repository;

import com.sifco.auditdoc.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmployeeId(String employeeId);
    boolean existsByEmail(String email);
    boolean existsByEmployeeId(String employeeId);
    List<User> findByRole(User.Role role);
    List<User> findByDepartment(String department);
    List<User> findByActiveTrue();

    @Query(value = "SELECT COUNT(*) FROM users WHERE is_active = true", nativeQuery = true)
    long countActiveUsers();

    @Query(value = "SELECT COUNT(*) FROM users WHERE role = :role AND is_active = true", nativeQuery = true)
    long countByRole(@Param("role") String role);

    default long countByRole(User.Role role) {
        return countByRole(role.name());
    }
}
