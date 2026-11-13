package com.rura.regtech.service;

public interface OcrService {
    String extractText(byte[] fileContent, String fileName);
}
