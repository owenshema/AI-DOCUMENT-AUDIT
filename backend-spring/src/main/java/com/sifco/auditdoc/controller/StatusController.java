package com.sifco.auditdoc.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class StatusController {

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("message", "AI Document Audit System API is running (Spring Boot)");
        response.put("timestamp", LocalDateTime.now());
        response.put("version", "1.0.0");
        response.put("framework", "Spring Boot 3.2");

        Map<String, String> modules = new LinkedHashMap<>();
        modules.put("authentication", "active");
        modules.put("dashboard", "active");
        modules.put("documents", "active");
        modules.put("analysis", "active");
        modules.put("compliance", "active");
        modules.put("audit", "active");
        modules.put("workflows", "active");
        modules.put("tasks", "active");
        modules.put("search", "active");
        modules.put("retention", "active");
        modules.put("security", "active");
        modules.put("auditLogs", "active");
        modules.put("versionControl", "active");
        response.put("modules", modules);

        return ResponseEntity.ok(response);
    }
}
