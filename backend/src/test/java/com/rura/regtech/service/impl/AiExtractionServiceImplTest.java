package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.ExtractedData;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AiExtractionServiceImplTest {

    private final AiExtractionServiceImpl service = new AiExtractionServiceImpl();

    @Test
    void extract_generatesSummary() {
        String ocr = """
                CERTIFICATE OF COMPLIANCE
                Company: Acme Corp Ltd
                Expiry Date: 31/12/2026
                Status: Compliant
                Issued by: Ministry of Commerce
                """;

        ExtractedData data = service.extract(ocr, "cert.pdf");
        String summary = data.getSummary();

        assertNotNull(summary);
        assertTrue(summary.contains("Acme Corp"));
        assertTrue(summary.contains("2026"));
        assertTrue(summary.contains("Compliant"));
        assertTrue(summary.contains("certificate"));
        assertTrue(summary.contains("Ministry of Commerce"));
    }

    @Test
    void extract_emptyOcr_returnsNullSummary() {
        ExtractedData data = service.extract("", "empty.txt");
        assertNull(data.getSummary());
    }
}