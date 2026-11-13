package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.ExtractedData;
import com.rura.regtech.service.AiExtractionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class AiExtractionServiceImpl implements AiExtractionService {

    @Value("${ai.groq.api-key:}")
    private String apiKey;

    @Value("${ai.groq.base-url:https://api.groq.com/openai/v1}")
    private String baseUrl;

    @Value("${ai.groq.model:llama-3.1-8b-instant}")
    private String model;

    // ---- Date patterns ----
    private static final List<Pattern> EXPIRY_DATE_PATTERNS = new ArrayList<>();
    private static final List<Pattern> ISSUE_DATE_PATTERNS = new ArrayList<>();
    private static final List<Pattern> GENERIC_DATE_PATTERNS = new ArrayList<>();

    static {
        EXPIRY_DATE_PATTERNS.add(Pattern.compile(
                "(?:expiry|expiration|expires|valid\\s*until|validity|expire\\s*date|expiry\\s*date|effective\\s*until|valid\\s*through)\\s*[:\\.]?\\s*(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})",
                Pattern.CASE_INSENSITIVE));
        EXPIRY_DATE_PATTERNS.add(Pattern.compile(
                "(?:expiry|expiration|expires|valid\\s*until|validity|expire\\s*date|expiry\\s*date|effective\\s*until|valid\\s*through)\\s*[:\\.]?\\s*(\\d{4}[/-]\\d{1,2}[/-]\\d{1,2})",
                Pattern.CASE_INSENSITIVE));
        EXPIRY_DATE_PATTERNS.add(Pattern.compile(
                "(?:expiry|expiration|expires|valid\\s*until|validity|expire\\s*date|expiry\\s*date|effective\\s*until|valid\\s*through)\\s*[:\\.]?\\s*(\\d{1,2}(?:st|nd|rd|th)?\\s+[A-Za-z]+\\s+\\d{4})",
                Pattern.CASE_INSENSITIVE));
        EXPIRY_DATE_PATTERNS.add(Pattern.compile(
                "(?:expiry|expiration|expires|valid\\s*until|validity|expire\\s*date|expiry\\s*date|effective\\s*until|valid\\s*through)\\s*[:\\.]?\\s*([A-Za-z]+\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})",
                Pattern.CASE_INSENSITIVE));

        ISSUE_DATE_PATTERNS.add(Pattern.compile(
                "(?:issued?\\s*(?:on|date)|date\\s*of\\s*issue|issue\\s*date|effective\\s*date|date\\s*of\\s*registration|registration\\s*date|created\\s*(?:on|date))\\s*[:\\.]?\\s*(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})",
                Pattern.CASE_INSENSITIVE));
        ISSUE_DATE_PATTERNS.add(Pattern.compile(
                "(?:issued?\\s*(?:on|date)|date\\s*of\\s*issue|issue\\s*date|effective\\s*date|date\\s*of\\s*registration|registration\\s*date|created\\s*(?:on|date))\\s*[:\\.]?\\s*(\\d{4}[/-]\\d{1,2}[/-]\\d{1,2})",
                Pattern.CASE_INSENSITIVE));
        ISSUE_DATE_PATTERNS.add(Pattern.compile(
                "(?:issued?\\s*(?:on|date)|date\\s*of\\s*issue|issue\\s*date|effective\\s*date|date\\s*of\\s*registration|registration\\s*date|created\\s*(?:on|date))\\s*[:\\.]?\\s*([A-Za-z]+\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})",
                Pattern.CASE_INSENSITIVE));

        GENERIC_DATE_PATTERNS.add(Pattern.compile("\\b(\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})\\b"));
        GENERIC_DATE_PATTERNS.add(Pattern.compile("\\b(\\d{4}[/-]\\d{1,2}[/-]\\d{1,2})\\b"));
        GENERIC_DATE_PATTERNS.add(Pattern.compile("\\b(\\d{1,2}(?:st|nd|rd|th)?\\s+[A-Za-z]+\\s+\\d{4})\\b"));
        GENERIC_DATE_PATTERNS.add(Pattern.compile("\\b([A-Za-z]+\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})\\b"));
    }

    // ---- Entity/Company patterns ----
    private static final Pattern COMPANY_PATTERN = Pattern.compile(
            "(?:company|organization|organization\\s*name|entity|firm|registered\\s*to|licensee|certificate\\s*holder|name\\s*of\\s*organization|business\\s*name|trade\\s*name|legal\\s*name|corporate\\s*name)\\s*[:\\.]?\\s*([A-Z][A-Za-z0-9\\s&.,'-]+)",
            Pattern.CASE_INSENSITIVE);

    // ---- Person name patterns ----
    private static final Pattern PERSON_NAME_PATTERN = Pattern.compile(
            "(?:name|full\\s*name|applicant\\s*name|holder\\s*name|director|owner|proprietor|responsible\\s*person|contact\\s*person|authorized\\s*person|representative)\\s*[:\\.]?\\s*([A-Z][A-Za-z\\s.'-]{2,50})",
            Pattern.CASE_INSENSITIVE);

    // ---- Document number patterns ----
    private static final Pattern DOC_NUMBER_PATTERN = Pattern.compile(
            "(?:registration\\s*(?:no|number)|license\\s*(?:no|number)|certificate\\s*(?:no|number)|document\\s*(?:no|number)|ref\\s*(?:no|number)|permit\\s*(?:no|number)|policy\\s*(?:no|number)|account\\s*(?:no|number)|file\\s*(?:no|number)|serial\\s*(?:no|number)|reference\\s*(?:no|number)|identification\\s*(?:no|number)|id\\s*(?:no|number)|tin|vat|tax\\s*(?:id|no|number))[\\s:.#]*([A-Z0-9][-A-Z0-9/]{4,})",
            Pattern.CASE_INSENSITIVE);

    // ---- Issuing authority patterns ----
    private static final Pattern AUTHORITY_PATTERN = Pattern.compile(
            "(?:issued\\s*by|issued\\s*from|issued\\s*at|issuing\\s*authority|authority|regulatory\\s*body|ministry|department\\s*of|bureau\\s*of|agency|commission|board\\s*of|licensed\\s*by|authorized\\s*by|approved\\s*by|registered\\s*with)\\s*[:\\.]?\\s*([A-Z][A-Za-z0-9\\s&.,'-]+)",
            Pattern.CASE_INSENSITIVE);

    // ---- Address patterns ----
    private static final Pattern ADDRESS_PATTERN = Pattern.compile(
            "(?:address|registered\\s*office|business\\s*address|physical\\s*address|postal\\s*address|location|site\\s*address|principal\\s*place)\\s*[:\\.]?\\s*([A-Za-z0-9\\s,.-]{10,120})",
            Pattern.CASE_INSENSITIVE);

    // ---- Compliance status patterns ----
    private static final List<Pattern> COMPLIANCE_STATUS_PATTERNS = new ArrayList<>();

    static {
        COMPLIANCE_STATUS_PATTERNS.add(Pattern.compile(
                "(?:compliance\\s*status|status|compliance)\\s*[:\\.]?\\s*(Compliant|Non-Compliant|NonCompliant|Valid|Invalid|Expired|Active|Inactive|Approved|Rejected|Pending)",
                Pattern.CASE_INSENSITIVE));
        COMPLIANCE_STATUS_PATTERNS.add(Pattern.compile(
                "\\b(Compliant|Non-Compliant|NonCompliant)\\b",
                Pattern.CASE_INSENSITIVE));
        COMPLIANCE_STATUS_PATTERNS.add(Pattern.compile(
                "\\b(Valid|Expired|Active|InActive|Approved|Pending)\\b",
                Pattern.CASE_INSENSITIVE));
    }

    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    public ExtractedData extract(String ocrText, String fileName) {
        if (ocrText == null || ocrText.trim().isEmpty()) {
            log.warn("Empty OCR text provided for extraction from file: {}", fileName);
            return new ExtractedData(null, null, null);
        }

        log.info("Extracting data from OCR text ({} chars) for file: {}", ocrText.length(), fileName);

        ExtractedData aiData = callGroqForMetadata(ocrText, fileName);
        if (aiData != null) {
            log.info("AI metadata extraction successful (via Groq) for file: {}", fileName);
            return aiData;
        }

        String expiryDate = findFirstDate(EXPIRY_DATE_PATTERNS, ocrText);
        String issueDate = findFirstDate(ISSUE_DATE_PATTERNS, ocrText);
        String companyName = findCompanyName(ocrText);
        String complianceStatus = findComplianceStatus(ocrText);
        String documentNumber = findDocumentNumber(ocrText);
        String issuingAuthority = findIssuingAuthority(ocrText);
        String fullName = findPersonName(ocrText);
        String address = findAddress(ocrText);
        String documentType = detectDocumentType(ocrText, fileName);

        // Fallback: if no specific issue-date match, use generic date but prefer issue context
        if (issueDate == null && expiryDate == null) {
            issueDate = findFirstDate(GENERIC_DATE_PATTERNS, ocrText);
        }

        String summary = generateSummary(fileName, companyName, expiryDate, issueDate, complianceStatus,
                documentNumber, issuingAuthority, fullName, address, documentType);

        ExtractedData data = new ExtractedData(expiryDate, companyName, complianceStatus);
        data.setSummary(summary);
        data.setDocumentNumber(documentNumber);
        data.setIssuingAuthority(issuingAuthority);
        data.setIssueDate(issueDate);
        data.setFullName(fullName);
        data.setAddress(address);
        data.setDocumentType(documentType);

        log.info("Extracted: company={}, expiry={}, issue={}, docNum={}, authority={}, person={}, status={}",
                companyName, expiryDate, issueDate, documentNumber, issuingAuthority, fullName, complianceStatus);
        return data;
    }

    @Override
    public double evaluateComplianceScore(String ocrText, String requirementTitle, String requirementDescription, String fileName) {
        if (ocrText == null || ocrText.trim().isEmpty()) return 0.0;

        // Try Groq AI API first
        Double aiScore = callGroqForScore(ocrText, requirementTitle, requirementDescription);
        if (aiScore != null) {
            log.info("AI compliance score for '{}': {} (via Groq)", fileName, aiScore);
            return aiScore;
        }

        // Fallback to rule-based scoring
        double score = fallbackScore(ocrText, requirementTitle, requirementDescription, fileName);
        log.info("AI compliance score for '{}': {} (fallback)", fileName, score);
        return score;
    }

    private Double callGroqForScore(String ocrText, String requirementTitle, String requirementDescription) {
        if (apiKey == null || apiKey.isEmpty() || "your-api-key-here".equals(apiKey)) {
            log.warn("Groq API key not configured for compliance scoring");
            return null;
        }
        try {
            String prompt = String.format("""
                You are a regulatory compliance expert for Rwanda's RURA.
                
                REQUIREMENT TITLE: %s
                REQUIREMENT DESCRIPTION: %s
                
                DOCUMENT OCR TEXT (extracted from uploaded file):
                %s
                
                First determine if this document is RELEVANT to the requirement above.
                If the document is NOT about the same topic, authority, or regulation as the requirement, return 0.
                
                If the document IS relevant, score compliance (0-100) based on:
                - Does the document address the requirement? (0-40)
                - Is it issued by the correct authority? (0-25)
                - Is the document valid and complete? (0-20)
                - Are dates and reference numbers present? (0-15)
                
                Return ONLY a single integer number between 0 and 100. No explanation, no text, just the number.
                """, requirementTitle, requirementDescription != null ? requirementDescription : "", ocrText);

            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 50);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            headers.set("Content-Type", "application/json");

            org.springframework.http.HttpEntity<Map<String, Object>> request = new org.springframework.http.HttpEntity<>(requestBody, headers);
            String url = baseUrl + "/chat/completions";

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);

            if (response != null && response.containsKey("choices")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");
                    if (content != null) {
                        content = content.trim().replaceAll("[^0-9]", "");
                        if (!content.isEmpty()) {
                            double score = Double.parseDouble(content);
                            return Math.max(0, Math.min(100, score));
                        }
                    }
                }
            }
            log.warn("Groq API returned unexpected response for scoring");
            return null;
        } catch (Exception e) {
            log.warn("Groq API call failed for scoring: {}", e.getMessage());
            return null;
        }
    }

    private double fallbackScore(String ocrText, String requirementTitle, String requirementDescription, String fileName) {
        // Relevance gate: at least one significant keyword from the requirement title must appear in the document
        if (requirementTitle != null) {
            String[] reqKeywords = requirementTitle.toLowerCase().split("\\s+");
            String ocrLower = ocrText.toLowerCase();
            boolean relevant = false;
            for (String word : reqKeywords) {
                if (word.length() > 3 && ocrLower.contains(word)) {
                    relevant = true;
                    break;
                }
            }
            if (!relevant) return 0.0;
        }

        double score = 0;

        // 1. Issuing authority presence (0-15)
        String authority = findIssuingAuthority(ocrText);
        if (authority != null && !authority.isEmpty()) score += 15;

        // 2. Document number present (0-10)
        String docNum = findDocumentNumber(ocrText);
        if (docNum != null && !docNum.isEmpty()) score += 10;

        // 3. Compliance status (0-25)
        String status = findComplianceStatus(ocrText);
        if (status != null) {
            String s = status.toLowerCase();
            if (s.contains("valid") || s.contains("compliant") || s.contains("approved") || s.contains("active")) score += 25;
            else if (s.contains("issued") || s.contains("registered")) score += 15;
        }

        // 4. Future expiry date (0-15)
        String expiryStr = findFirstDate(EXPIRY_DATE_PATTERNS, ocrText);
        if (expiryStr != null) {
            try {
                LocalDate parsed = parseDate(expiryStr.replaceAll(",", "").trim());
                if (parsed != null && parsed.isAfter(LocalDate.now())) score += 15;
                else if (parsed != null) score += 5; // expired but present
            } catch (Exception e) {
                // ignore
            }
        }

        // 5. Company name present (0-5)
        String company = findCompanyName(ocrText);
        if (company != null && !company.isEmpty()) score += 5;

        // 6. Document type matches requirement keywords (0-10)
        String docType = detectDocumentType(ocrText, fileName);
        if (docType != null && requirementTitle != null) {
            String[] reqWords = requirementTitle.toLowerCase().split("\\s+");
            String[] typeWords = docType.toLowerCase().split("_");
            for (String tw : typeWords) {
                for (String rw : reqWords) {
                    if (rw.contains(tw) || tw.contains(rw)) {
                        score += 5;
                        break;
                    }
                }
            }
        }

        // 7. Summary matches requirement keywords (0-20)
        String summary = generateSummary(fileName, company, expiryStr, null, status, docNum, authority, null, null, null);
        if (summary != null && requirementTitle != null) {
            String[] reqWords = requirementTitle.toLowerCase().split("\\s+");
            String summaryLower = summary.toLowerCase();
            for (String word : reqWords) {
                if (word.length() > 3 && summaryLower.contains(word)) {
                    score += 2;
                }
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    // ---- Individual extractors ----

    private String findFirstDate(List<Pattern> patterns, String text) {
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String dateStr = matcher.group(1)
                        .replaceAll("(\\d+)(st|nd|rd|th)", "$1")
                        .replace(",", "")
                        .trim();
                try {
                    LocalDate parsed = parseDate(dateStr);
                    if (parsed != null) {
                        return parsed.format(DateTimeFormatter.ISO_LOCAL_DATE);
                    }
                } catch (Exception e) {
                    continue;
                }
            }
        }
        return null;
    }

    private String findCompanyName(String text) {
        Matcher matcher = COMPANY_PATTERN.matcher(text);
        if (matcher.find()) {
            String name = matcher.group(1).trim();
            if (name.length() > 2 && name.length() < 200) {
                return name;
            }
        }
        return null;
    }

    private String findComplianceStatus(String text) {
        for (Pattern pattern : COMPLIANCE_STATUS_PATTERNS) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                return matcher.group(1);
            }
        }
        return null;
    }

    private String findDocumentNumber(String text) {
        Matcher matcher = DOC_NUMBER_PATTERN.matcher(text);
        if (matcher.find()) {
            String num = matcher.group(1).trim();
            if (num.length() >= 3 && num.length() < 50) {
                return num;
            }
        }
        return null;
    }

    private String findIssuingAuthority(String text) {
        Matcher matcher = AUTHORITY_PATTERN.matcher(text);
        if (matcher.find()) {
            String auth = matcher.group(1).trim();
            if (auth.length() > 2 && auth.length() < 150) {
                return auth;
            }
        }
        return null;
    }

    private String findPersonName(String text) {
        Matcher matcher = PERSON_NAME_PATTERN.matcher(text);
        if (matcher.find()) {
            String name = matcher.group(1).trim();
            if (name.length() > 2 && name.length() < 100 && !name.matches(".*\\d.*")) {
                return name;
            }
        }
        return null;
    }

    private String findAddress(String text) {
        Matcher matcher = ADDRESS_PATTERN.matcher(text);
        if (matcher.find()) {
            String addr = matcher.group(1).trim();
            if (addr.length() > 8 && addr.length() < 200) {
                return addr;
            }
        }
        return null;
    }

    private String detectDocumentType(String text, String fileName) {
        String lower = text.toLowerCase();
        if (lower.contains("certificate") || lower.contains("certification")) return "Certificate";
        if (lower.contains("license") || lower.contains("licence")) return "License";
        if (lower.contains("permit") || lower.contains("permission")) return "Permit";
        if (lower.contains("registration") || lower.contains("register")) return "Registration Document";
        if (lower.contains("report") || lower.contains("audit")) return "Report";
        if (lower.contains("policy") || lower.contains("insurance")) return "Policy/Insurance";
        if (lower.contains("tax")) return "Tax Document";
        if (lower.contains("invoice") || lower.contains("bill")) return "Invoice";
        if (lower.contains("contract") || lower.contains("agreement")) return "Contract/Agreement";
        if (lower.contains("application") || lower.contains("form")) return "Application Form";
        if (lower.contains("letter") || lower.contains("correspondence")) return "Letter/Correspondence";
        if (lower.contains("identification") || lower.contains("id card") || lower.contains("passport")) return "Identification Document";

        // Fallback: infer from filename
        if (fileName != null) {
            String fn = fileName.toLowerCase();
            if (fn.contains("cert")) return "Certificate";
            if (fn.contains("license") || fn.contains("licence")) return "License";
            if (fn.contains("permit")) return "Permit";
            if (fn.contains("registration") || fn.contains("register")) return "Registration Document";
            if (fn.contains("report")) return "Report";
            if (fn.contains("invoice")) return "Invoice";
            if (fn.contains("contract")) return "Contract";
            if (fn.contains("policy") || fn.contains("insurance")) return "Policy/Insurance";
            if (fn.contains("tax")) return "Tax Document";
            if (fn.contains("letter")) return "Letter";
        }
        return "Document";
    }

    private String deriveEntityName(String company, String fileName) {
        if (company != null) return company.trim();
        if (fileName != null) {
            String stem = fileName.replaceFirst("\\.[^.]+$", "");
            stem = stem.replaceAll("[-_]", " ");
            stem = stem.replaceAll("\\s+", " ").trim();
            String lower = stem.toLowerCase();
            if (!lower.equals("document") && !lower.equals("scan") && !lower.equals("image")
                    && !lower.equals("photo") && !lower.equals("file") && !lower.equals("untitled")) {
                return stem;
            }
        }
        return null;
    }

    private String generateSummary(String fileName, String company, String expiry, String issueDate,
                                    String compliance, String docNumber, String authority,
                                    String personName, String address, String docType) {
        String entityName = deriveEntityName(company, fileName);

        String lower = fileName != null ? fileName.toLowerCase() : "";

        StringBuilder sb = new StringBuilder();
        sb.append("This ").append(docType != null ? docType.toLowerCase() : "document");

        if (entityName != null) {
            sb.append(" belongs to ").append(entityName);
        }
        sb.append(".");

        if (docNumber != null) {
            sb.append(" ").append(docType != null ? docType : "Document").append(" number: ").append(docNumber).append(".");
        }

        if (personName != null) {
            sb.append(" Named person: ").append(personName).append(".");
        }

        if (issueDate != null) {
            try {
                LocalDate id = LocalDate.parse(issueDate);
                sb.append(" Issued on ").append(id.format(DateTimeFormatter.ofPattern("d MMMM yyyy"))).append(".");
            } catch (Exception e) {
                sb.append(" Issue date: ").append(issueDate).append(".");
            }
        }

        if (expiry != null) {
            try {
                LocalDate expDate = LocalDate.parse(expiry);
                if (expDate.isBefore(LocalDate.now())) {
                    sb.append(" It expired on ").append(expDate.format(DateTimeFormatter.ofPattern("d MMMM yyyy"))).append(".");
                } else if (expDate.isBefore(LocalDate.now().plusDays(30))) {
                    sb.append(" It expires on ").append(expDate.format(DateTimeFormatter.ofPattern("d MMMM yyyy"))).append(" (within 30 days).");
                } else {
                    sb.append(" It is valid until ").append(expDate.format(DateTimeFormatter.ofPattern("d MMMM yyyy"))).append(".");
                }
            } catch (Exception e) {
                sb.append(" Expiry: ").append(expiry).append(".");
            }
        }

        if (authority != null) {
            sb.append(" Issued by ").append(authority).append(".");
        }

        if (compliance != null) {
            sb.append(" Status: ").append(compliance).append(".");
        }

        if (address != null) {
            sb.append(" Address: ").append(address).append(".");
        }

        return sb.toString();
    }

    private LocalDate parseDate(String dateStr) {
        String[] formats = {"dd/MM/yyyy", "MM/dd/yyyy", "yyyy/MM/dd", "dd-MM-yyyy", "MM-dd-yyyy", "yyyy-MM-dd",
                "dd MMMM yyyy", "d MMMM yyyy", "MMMM dd yyyy", "MMMM d yyyy", "dd MMM yyyy", "d MMM yyyy",
                "MMM dd yyyy", "MMM d yyyy"};
        for (String format : formats) {
            try {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(format));
            } catch (DateTimeParseException e) {
                continue;
            }
        }

        if (dateStr.length() == 10 && dateStr.charAt(4) == '-' && dateStr.charAt(7) == '-') {
            try {
                return LocalDate.parse(dateStr);
            } catch (DateTimeParseException e) {
            }
        }

        return null;
    }

    private ExtractedData callGroqForMetadata(String ocrText, String fileName) {
        if (apiKey == null || apiKey.isEmpty() || "your-api-key-here".equals(apiKey)) {
            log.warn("Groq API key not configured for metadata extraction");
            return null;
        }
        try {
            String prompt = String.format("""
                Analyze the following document OCR text extracted from file '%s' and extract key metadata into a JSON format.
                
                DOCUMENT OCR TEXT:
                %s
                
                You must respond ONLY with a valid JSON object matching the schema below. Do not wrap in markdown code blocks like ```json or similar, just output the raw JSON.
                
                JSON Schema:
                {
                  "expiryDate": "YYYY-MM-DD or null if not found",
                  "companyName": "Company or entity name or null",
                  "complianceStatus": "Compliant (if valid, active, approved, compliant, etc. or AI_SUGGESTS_APPROVAL) or Non-Compliant (if expired, invalid, or AI_SUGGESTS_REJECTION)",
                  "summary": "A concise summary of the document and its status",
                  "documentNumber": "Registration, permit, or certificate number or null",
                  "issuingAuthority": "The authority that issued the document or null",
                  "issueDate": "YYYY-MM-DD or null if not found",
                  "fullName": "Full name of any individual listed or null",
                  "address": "Address or null",
                  "documentType": "Type of document, e.g., Certificate, License, Permit, Tax Document, Invoice, etc."
                }
                """, fileName, ocrText);

            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 1000);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            headers.set("Content-Type", "application/json");

            org.springframework.http.HttpEntity<Map<String, Object>> request = new org.springframework.http.HttpEntity<>(requestBody, headers);
            String url = baseUrl + "/chat/completions";

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);

            if (response != null && response.containsKey("choices")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");
                    if (content != null) {
                        content = content.trim();
                        if (content.startsWith("```")) {
                            content = content.replaceAll("^```[a-zA-Z]*\\n", "").replaceAll("\\n```$", "").trim();
                        }
                        
                        Map<String, Object> jsonMap = objectMapper.readValue(content, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                        
                        ExtractedData data = new ExtractedData();
                        data.setExpiryDate((String) jsonMap.get("expiryDate"));
                        data.setCompanyName((String) jsonMap.get("companyName"));
                        
                        String compStatus = (String) jsonMap.get("complianceStatus");
                        if (compStatus != null) {
                            if (compStatus.toLowerCase().contains("non-compliant") || compStatus.toLowerCase().contains("rejection") || compStatus.toLowerCase().contains("invalid") || compStatus.toLowerCase().contains("expired")) {
                                data.setComplianceStatus("Non-Compliant");
                            } else {
                                data.setComplianceStatus("Compliant");
                            }
                        } else {
                            data.setComplianceStatus("Compliant");
                        }

                        data.setSummary((String) jsonMap.get("summary"));
                        data.setDocumentNumber((String) jsonMap.get("documentNumber"));
                        data.setIssuingAuthority((String) jsonMap.get("issuingAuthority"));
                        data.setIssueDate((String) jsonMap.get("issueDate"));
                        data.setFullName((String) jsonMap.get("fullName"));
                        data.setAddress((String) jsonMap.get("address"));
                        data.setDocumentType((String) jsonMap.get("documentType"));
                        
                        return data;
                    }
                }
            }
            log.warn("Groq API returned unexpected response for metadata extraction");
            return null;
        } catch (Exception e) {
            log.warn("Groq API call failed for metadata extraction: {}", e.getMessage());
            return null;
        }
    }
}