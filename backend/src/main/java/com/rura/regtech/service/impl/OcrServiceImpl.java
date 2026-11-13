package com.rura.regtech.service.impl;

import com.rura.regtech.service.OcrService;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;

@Service
@Slf4j
public class OcrServiceImpl implements OcrService {

    @Override
    public String extractText(byte[] fileContent, String fileName) {
        if (fileContent == null || fileContent.length == 0) {
            return "";
        }

        String lowerFileName = fileName != null ? fileName.toLowerCase() : "";

        try {
            if (lowerFileName.endsWith(".pdf")) {
                return extractFromPdf(fileContent);
            } else if (isImageFile(lowerFileName)) {
                return extractFromImage(fileContent);
            } else {
                log.warn("Unsupported file type for OCR: {}", fileName);
                return "";
            }
        } catch (Exception e) {
            log.error("Error extracting text from {}: {}", fileName, e.getMessage());
            return "";
        }
    }

    private String extractFromPdf(byte[] content) {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(content)) {
            PdfReader reader = new PdfReader(bais);
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            StringBuilder text = new StringBuilder();
            for (int i = 1; i <= reader.getNumberOfPages(); i++) {
                String pageText = extractor.getTextFromPage(i);
                text.append(pageText).append("\n");
            }
            reader.close();
            return text.toString().trim();
        } catch (Exception e) {
            log.warn("Failed to extract PDF text: {}", e.getMessage());
            return "";
        }
    }

    private String extractFromImage(byte[] content) {
        try {
            return extractWithTesseract(content);
        } catch (Exception e) {
            log.warn("OCR processing failed (Tesseract may not be installed): {}", e.getMessage());
            return "";
        }
    }

    private String extractWithTesseract(byte[] content) throws Exception {
        ByteArrayInputStream bais = new ByteArrayInputStream(content);
        BufferedImage image = ImageIO.read(bais);
        if (image == null) {
            log.warn("Could not read image from file content");
            return "";
        }
        net.sourceforge.tess4j.ITesseract tesseract = new net.sourceforge.tess4j.Tesseract();
        return tesseract.doOCR(image).trim();
    }

    private boolean isImageFile(String fileName) {
        return fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")
                || fileName.endsWith(".gif") || fileName.endsWith(".bmp") || fileName.endsWith(".tiff")
                || fileName.endsWith(".tif");
    }
}
