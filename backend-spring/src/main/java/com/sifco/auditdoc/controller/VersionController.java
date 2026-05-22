package com.sifco.auditdoc.controller;

import com.sifco.auditdoc.dto.ApiResponse;
import com.sifco.auditdoc.entity.DocumentVersion;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.service.VersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/documents/{documentId}/versions")
@RequiredArgsConstructor
public class VersionController {

    private final VersionService versionService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DocumentVersion>>> getVersions(@PathVariable String documentId) {
        return ResponseEntity.ok(ApiResponse.success(versionService.getVersions(documentId)));
    }

    @GetMapping("/{versionNumber}")
    public ResponseEntity<ApiResponse<DocumentVersion>> getVersion(
            @PathVariable String documentId, @PathVariable Integer versionNumber) {
        return ResponseEntity.ok(ApiResponse.success(versionService.getVersion(documentId, versionNumber)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DocumentVersion>> createVersion(
            @PathVariable String documentId,
            @RequestBody DocumentVersion version,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("Version created",
                versionService.createVersion(documentId, version, user.getId())));
    }

    @PostMapping("/{versionNumber}/restore")
    public ResponseEntity<ApiResponse<DocumentVersion>> restore(
            @PathVariable String documentId, @PathVariable Integer versionNumber) {
        return ResponseEntity.ok(ApiResponse.success("Version restored",
                versionService.restoreVersion(documentId, versionNumber)));
    }
}
