package com.sifco.auditdoc.controller;

import com.sifco.auditdoc.dto.ApiResponse;
import com.sifco.auditdoc.entity.Workflow;
import com.sifco.auditdoc.repository.UserRepository;
import com.sifco.auditdoc.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Workflow>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.getAll(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Workflow>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','AUDITOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<Workflow>> create(
            @RequestBody Workflow workflow,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("Workflow created", workflowService.create(workflow, user.getId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR','AUDITOR','DOCUMENT_MANAGER')")
    public ResponseEntity<ApiResponse<Workflow>> update(@PathVariable String id, @RequestBody Workflow updates) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.update(id, updates)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        workflowService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Workflow deleted", null));
    }
}
