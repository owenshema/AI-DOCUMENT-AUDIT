package com.sifco.auditdoc.controller;

import com.sifco.auditdoc.dto.ApiResponse;
import com.sifco.auditdoc.entity.DocumentAnalysis;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<DocumentAnalysis>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(analysisService.getAll(page, size)));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(analysisService.getAnalysisStats()));
    }

    @GetMapping("/document/{documentId}")
    public ResponseEntity<ApiResponse<DocumentAnalysis>> getByDocument(@PathVariable String documentId) {
        return ResponseEntity.ok(ApiResponse.success(analysisService.getByDocumentId(documentId)));
    }

    @PostMapping("/document/{documentId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','AUDITOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<DocumentAnalysis>> analyze(
            @PathVariable String documentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        DocumentAnalysis result = analysisService.analyzeDocument(documentId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Analysis complete", result));
    }
}
