package com.sifco.auditdoc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
public class AuditDocApplication {

    public static void main(String[] args) {
        printBanner();
        SpringApplication.run(AuditDocApplication.class, args);
    }

    private static void printBanner() {
        System.out.println("""
            \n╔════════════════════════════════════════════════════════════╗
            ║  AI-Powered Document Audit System  v1.0.0  (Spring Boot)  ║
            ║  PostgreSQL Database: AIDOCUMENT_DB                        ║
            ║  Running on http://localhost:8080                          ║
            ╚════════════════════════════════════════════════════════════╝
            
            All 13 Modules Active:
              ✓ 1.  User Registration & Authentication
              ✓ 2.  Dashboard & Metrics
              ✓ 3.  Document Ingestion & Management
              ✓ 4.  AI Document Analysis
              ✓ 5.  Compliance & Policy Checking
              ✓ 6.  Audit Reporting
              ✓ 7.  Document Management
              ✓ 8.  Workflow & Task Management
              ✓ 9.  Version Control & History
              ✓ 10. Advanced Search & Discovery
              ✓ 11. Confidentiality & Security
              ✓ 12. Retention & Archival
              ✓ 13. Audit Trail & Logging
            
            API Base:  http://localhost:8080/api
            Swagger UI: http://localhost:8080/swagger-ui.html
            Status:    GET http://localhost:8080/api/status
            """);
    }
}
