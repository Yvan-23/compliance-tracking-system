package com.rura.regtech.service;

import com.rura.regtech.dto.response.ExtractedData;

public interface AiExtractionService {
    ExtractedData extract(String ocrText, String fileName);
    double evaluateComplianceScore(String ocrText, String requirementTitle, String requirementDescription, String fileName);
}
