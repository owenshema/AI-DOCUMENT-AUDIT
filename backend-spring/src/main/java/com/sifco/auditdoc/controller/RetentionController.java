package com.sifco.auditdoc.controller;

import com.sifco.auditdoc.dto.ApiResponse;
import com.sifco.auditdoc.entity.RetentionPolicy;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.service.RetentionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/retention")
@RequiredArgsConstructor
public class RetentionController {

    private final RetentionService retentionService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RetentionPolicy>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(retentionService.getAll(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RetentionPolicy>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(retentionService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<RetentionPolicy>> create(
            @RequestBody RetentionPolicy policy,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("Retention policy created", retentionService.create(policy, user.getId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<RetentionPolicy>> update(@PathVariable String id, @RequestBody RetentionPolicy updates) {
        return ResponseEntity.ok(ApiResponse.success(retentionService.update(id, updates)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        retentionService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Retention policy deleted", null));
    }
}
