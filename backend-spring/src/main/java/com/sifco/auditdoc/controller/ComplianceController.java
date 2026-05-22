package com.sifco.auditdoc.controller;

import com.sifco.auditdoc.dto.ApiResponse;
import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.service.ComplianceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/compliance")
@RequiredArgsConstructor
public class ComplianceController {

    private final ComplianceService complianceService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ComplianceCheck>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(complianceService.getAll(page, size)));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(complianceService.getComplianceStats()));
    }

    @GetMapping("/document/{documentId}")
    public ResponseEntity<ApiResponse<List<ComplianceCheck>>> getByDocument(@PathVariable String documentId) {
        return ResponseEntity.ok(ApiResponse.success(complianceService.getByDocument(documentId)));
    }

    @PostMapping("/check")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','AUDITOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<ComplianceCheck>> runCheck(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        ComplianceCheck result = complianceService.runComplianceCheck(
                body.get("documentId"), body.get("policyId"), user.getId());
        return ResponseEntity.ok(ApiResponse.success("Compliance check complete", result));
    }

    @GetMapping("/policies")
    public ResponseEntity<ApiResponse<Page<Policy>>> getPolicies(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(complianceService.getPolicies(page, size)));
    }

    @PostMapping("/policies")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<Policy>> createPolicy(@RequestBody Policy policy) {
        return ResponseEntity.ok(ApiResponse.success("Policy created", complianceService.createPolicy(policy)));
    }

    @PutMapping("/policies/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<Policy>> updatePolicy(@PathVariable String id, @RequestBody Policy updates) {
        return ResponseEntity.ok(ApiResponse.success(complianceService.updatePolicy(id, updates)));
    }
}
