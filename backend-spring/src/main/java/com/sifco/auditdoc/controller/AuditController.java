package com.sifco.auditdoc.controller;

import com.sifco.auditdoc.dto.ApiResponse;
import com.sifco.auditdoc.entity.AuditReport;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audits")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditReport>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(auditService.getReports(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AuditReport>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(auditService.getReport(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','AUDITOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<AuditReport>> create(
            @RequestBody AuditReport report,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("Report created", auditService.createReport(report, user.getId())));
    }

    @PostMapping("/{id}/generate")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','AUDITOR')")
    public ResponseEntity<ApiResponse<AuditReport>> generate(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Report generated", auditService.generateReport(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','AUDITOR')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        auditService.deleteReport(id);
        return ResponseEntity.ok(ApiResponse.success("Report deleted", null));
    }
}
