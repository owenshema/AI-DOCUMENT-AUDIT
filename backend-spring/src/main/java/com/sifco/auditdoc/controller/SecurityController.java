package com.sifco.auditdoc.controller;

import com.sifco.auditdoc.dto.ApiResponse;
import com.sifco.auditdoc.entity.SecurityRecord;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.service.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
public class SecurityController {

    private final SecurityService securityService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<ApiResponse<Page<SecurityRecord>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(securityService.getAll(page, size)));
    }

    @GetMapping("/document/{documentId}")
    public ResponseEntity<ApiResponse<SecurityRecord>> getByDocument(@PathVariable String documentId) {
        return ResponseEntity.ok(ApiResponse.success(securityService.getByDocument(documentId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<SecurityRecord>> create(
            @RequestBody SecurityRecord record,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("Security record created",
                securityService.create(record, user.getId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<SecurityRecord>> update(
            @PathVariable String id, @RequestBody SecurityRecord updates) {
        return ResponseEntity.ok(ApiResponse.success(securityService.update(id, updates)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        securityService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Security record deleted", null));
    }
}
