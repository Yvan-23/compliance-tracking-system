package com.rura.regtech.controller;

import com.rura.regtech.security.CustomUserDetailsService;
import com.rura.regtech.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final CustomUserDetailsService userDetailsService;

    @GetMapping("/certificate/{recordId}")
    public ResponseEntity<byte[]> downloadCertificate(@PathVariable UUID recordId) {
        byte[] pdfBytes = reportService.generateComplianceCertificate(recordId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=certificate-" + recordId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/admin/pdf")
    public ResponseEntity<byte[]> downloadAdminReport(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer days) {
        
        LocalDate finalStart = startDate;
        LocalDate finalEnd = endDate;
        if (days != null) {
            finalEnd = LocalDate.now();
            finalStart = LocalDate.now().minusDays(days);
        }

        byte[] pdfBytes = reportService.generateAdminReport(finalStart, finalEnd);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=admin-compliance-report.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/entity/pdf")
    public ResponseEntity<?> downloadEntityReport(
            Authentication authentication,
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer days) {
        
        UUID orgId = organizationId;
        if (orgId == null) {
            try {
                orgId = userDetailsService.getOrganizationId(authentication.getName());
            } catch (Exception e) {
                return ResponseEntity.badRequest()
                        .body(new com.rura.regtech.dto.response.ApiResponse<>(false,
                                "No organization associated with your account. Please contact an administrator.", null));
            }
        }
        
        LocalDate finalStart = startDate;
        LocalDate finalEnd = endDate;
        if (days != null) {
            finalEnd = LocalDate.now();
            finalStart = LocalDate.now().minusDays(days);
        }

        byte[] pdfBytes = reportService.generateEntityReport(orgId, finalStart, finalEnd);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=entity-compliance-report.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/auditor/pdf")
    public ResponseEntity<byte[]> downloadAuditorReport(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer days) {
        
        LocalDate finalStart = startDate;
        LocalDate finalEnd = endDate;
        if (days != null) {
            finalEnd = LocalDate.now();
            finalStart = LocalDate.now().minusDays(days);
        }

        byte[] pdfBytes = reportService.generateAuditorReport(finalStart, finalEnd);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=auditor-compliance-report.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
