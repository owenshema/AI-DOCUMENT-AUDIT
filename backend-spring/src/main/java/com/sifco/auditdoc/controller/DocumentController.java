package com.sifco.auditdoc.controller;

import com.sifco.auditdoc.dto.ApiResponse;
import com.sifco.auditdoc.entity.Document;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.service.DocumentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Document>>> getDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        Page<Document> docs = documentService.getDocuments(user.getId(), user.getRole(), page, size, status);
        return ResponseEntity.ok(ApiResponse.success(docs));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Document>> getDocument(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(documentService.getDocument(id)));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Document>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String project,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request) throws IOException {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        Map<String, String> metadata = new HashMap<>();
        if (title != null) metadata.put("title", title);
        if (description != null) metadata.put("description", description);
        if (documentType != null) metadata.put("documentType", documentType);
        if (department != null) metadata.put("department", department);
        if (project != null) metadata.put("project", project);
        Document doc = documentService.uploadDocument(file, metadata, user.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Document uploaded successfully", doc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Document>> updateDocument(
            @PathVariable String id,
            @RequestBody Map<String, String> updates,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success(documentService.updateDocument(id, updates, user.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        documentService.deleteDocument(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Document deleted", null));
    }
}
