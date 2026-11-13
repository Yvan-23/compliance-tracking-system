package com.rura.regtech.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.rura.regtech.entity.*;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.entity.enums.InspectionStatus;
import com.rura.regtech.entity.enums.SubmissionStatus;
import com.rura.regtech.exception.ComplianceRuleViolationException;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ComplianceRecordRepository recordRepository;
    private final OrganizationRepository organizationRepository;
    private final SubmissionRepository submissionRepository;
    private final InspectionRepository inspectionRepository;
    private final ComplianceRequirementRepository requirementRepository;
    private final NotificationRepository notificationRepository;

    private static class CertificateBorder extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            cb.setColorStroke(new Color(24, 76, 120)); // Corporate Dark Blue
            cb.setLineWidth(3f);
            // Draw outer border
            cb.rectangle(20, 20, document.getPageSize().getWidth() - 40, document.getPageSize().getHeight() - 40);
            cb.stroke();

            // Draw thin inner border
            cb.setColorStroke(new Color(180, 180, 180)); // Muted Grey
            cb.setLineWidth(1f);
            cb.rectangle(25, 25, document.getPageSize().getWidth() - 50, document.getPageSize().getHeight() - 50);
            cb.stroke();
        }
    }

    private static class ReportHeaderFooter extends PdfPageEventHelper {
        private final String title;
        private final String logoPath;
        private final Font footerFont = new Font(Font.HELVETICA, 8, Font.ITALIC, new Color(120, 120, 120));

        public ReportHeaderFooter(String title, String logoPath) {
            this.title = title;
            this.logoPath = logoPath;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setTotalWidth(document.right() - document.left());
            headerTable.setLockedWidth(true);
            try {
                headerTable.setWidths(new float[] { 1.5f, 8.5f });

                // Logo
                Image img = null;
                if (logoPath != null) {
                    try {
                        img = Image.getInstance(logoPath);
                    } catch (Exception ex) {
                        log.warn("Failed to load image in ReportHeaderFooter: " + ex.getMessage());
                    }
                }

                if (img != null) {
                    img.scaleToFit(50, 40);
                    PdfPCell logoCell = new PdfPCell(img);
                    logoCell.setBorder(Rectangle.NO_BORDER);
                    logoCell.setPaddingBottom(5);
                    logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    headerTable.addCell(logoCell);
                } else {
                    PdfPCell textLogoCell = new PdfPCell(
                            new Phrase("RURA", new Font(Font.HELVETICA, 14, Font.BOLD, new Color(0, 83, 135))));
                    textLogoCell.setBorder(Rectangle.NO_BORDER);
                    textLogoCell.setPaddingBottom(5);
                    textLogoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    headerTable.addCell(textLogoCell);
                }

                // Title & Subtitle
                Paragraph p = new Paragraph();
                p.add(new Chunk(title + "\n", new Font(Font.HELVETICA, 14, Font.BOLD, new Color(0, 83, 135))));
                p.add(new Chunk("Official RURA Compliance Administrative Document",
                        new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(108, 117, 125))));
                PdfPCell titleCell = new PdfPCell(p);
                titleCell.setBorder(Rectangle.NO_BORDER);
                titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                titleCell.setPaddingBottom(5);
                headerTable.addCell(titleCell);

                headerTable.writeSelectedRows(0, -1, document.left(), document.top() + 45, writer.getDirectContent());

                // Footer (only base details, signature will be added in body at the end of
                // report!)
                PdfPTable footerTable = new PdfPTable(2);
                footerTable.setTotalWidth(document.right() - document.left());
                footerTable.setLockedWidth(true);

                PdfPCell footerLeft = new PdfPCell(
                        new Phrase("Generated: " + LocalDate.now().format(DateTimeFormatter.ISO_DATE) + " | Page "
                                + writer.getPageNumber(), footerFont));
                footerLeft.setBorder(Rectangle.TOP);
                footerLeft.setBorderColor(Color.LIGHT_GRAY);
                footerLeft.setBorderWidth(0.5f);
                footerLeft.setPaddingTop(5);
                footerTable.addCell(footerLeft);

                PdfPCell footerRight = new PdfPCell(new Phrase("Confidential - RURA Regulatory Use Only", footerFont));
                footerRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
                footerRight.setBorder(Rectangle.TOP);
                footerRight.setBorderColor(Color.LIGHT_GRAY);
                footerRight.setBorderWidth(0.5f);
                footerRight.setPaddingTop(5);
                footerTable.addCell(footerRight);

                footerTable.writeSelectedRows(0, -1, document.left(), document.bottom() - 15,
                        writer.getDirectContent());

            } catch (Exception e) {
                log.error("Error drawing page header/footer", e);
            }
        }
    }

    public void addStyledTableHeader(PdfPTable table, String... headers) {
        Font headerFont = new Font(Font.HELVETICA, 8, Font.BOLD, new Color(33, 37, 41));
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h.toUpperCase(), headerFont));
            cell.setBackgroundColor(Color.WHITE);
            // Thick top border, thinner bottom border
            cell.setBorder(Rectangle.TOP | Rectangle.BOTTOM);
            cell.setBorderWidthTop(2f);
            cell.setBorderColorTop(new Color(33, 37, 41));
            cell.setBorderWidthBottom(1f);
            cell.setBorderColorBottom(new Color(33, 37, 41));
            cell.setPaddingTop(8);
            cell.setPaddingBottom(8);
            cell.setPaddingLeft(6);
            cell.setPaddingRight(6);
            cell.setHorizontalAlignment(Element.ALIGN_LEFT);
            table.addCell(cell);
        }
    }

    public void addStyledTableRow(PdfPTable table, boolean isLastRow, String... values) {
        for (int i = 0; i < values.length; i++) {
            String v = values[i];

            // Check value to decide font and color
            Font cellFont = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(50, 50, 50));

            // Column 0 is usually the name (let's bold it like in the image!)
            if (i == 0) {
                cellFont = new Font(Font.HELVETICA, 8, Font.BOLD, new Color(33, 37, 41));
            }

            Phrase phrase = new Phrase(v != null ? v : "", cellFont);

            // Style specific text like organization types and compliance statuses
            if (v != null) {
                String upper = v.toUpperCase();
                if (upper.equals("REGULATOR") || upper.equals("GOVERNMENT AGENCY")) {
                    phrase = new Phrase(v.replace("_", " "),
                            new Font(Font.HELVETICA, 8, Font.BOLD, new Color(24, 76, 120)));
                } else if (upper.equals("REGULATED_ENTITY") || upper.equals("NGO")) {
                    phrase = new Phrase(v.replace("_", " "),
                            new Font(Font.HELVETICA, 8, Font.BOLD, new Color(139, 92, 246))); // Purple
                } else if (upper.equals("PRIVATE")) {
                    phrase = new Phrase(v.replace("_", " "),
                            new Font(Font.HELVETICA, 8, Font.BOLD, new Color(16, 185, 129))); // Green
                } else if (upper.equals("COMPLIANT") || upper.equals("ACTIVE") || upper.equals("APPROVED")) {
                    phrase = new Phrase(v, new Font(Font.HELVETICA, 8, Font.BOLD, new Color(16, 185, 129)));
                } else if (upper.equals("PENDING") || upper.equals("UNDER_REVIEW") || upper.equals("SCHEDULED")) {
                    phrase = new Phrase(v.replace("_", " "),
                            new Font(Font.HELVETICA, 8, Font.BOLD, new Color(245, 158, 11))); // Yellow
                } else if (upper.equals("NON_COMPLIANT") || upper.equals("SUSPENDED") || upper.equals("REJECTED")
                        || upper.equals("NON-COMPLIANT")) {
                    phrase = new Phrase(v.replace("_", " "),
                            new Font(Font.HELVETICA, 8, Font.BOLD, new Color(239, 68, 68))); // Red
                }
            }

            PdfPCell cell = new PdfPCell(phrase);
            cell.setPaddingTop(8);
            cell.setPaddingBottom(8);
            cell.setPaddingLeft(6);
            cell.setPaddingRight(6);

            if (isLastRow) {
                cell.setBorder(Rectangle.BOTTOM);
                cell.setBorderWidthBottom(2f);
                cell.setBorderColorBottom(new Color(33, 37, 41));
            } else {
                cell.setBorder(Rectangle.BOTTOM);
                cell.setBorderWidthBottom(0.5f);
                cell.setBorderColorBottom(new Color(225, 225, 225));
            }
            cell.setHorizontalAlignment(Element.ALIGN_LEFT);
            table.addCell(cell);
        }
    }

    public void addReportFooterAndSignatures(Document document) throws DocumentException {
        addReportFooterAndSignatures(document, "SYSTEM ADMINISTRATOR", "RURA Compliance Platform", "ADMIN",
                "SYSTEM ADMINISTRATOR");
    }

    public void addReportFooterAndSignatures(Document document, String leftTitleStr, String leftSubStr,
            String rightTitleStr, String rightSubStr) throws DocumentException {
        document.add(new Paragraph("\n"));

        // Confidentiality text
        Font confidentialFont = new Font(Font.HELVETICA, 9, Font.ITALIC, new Color(108, 117, 125));
        Paragraph conf = new Paragraph("This report is confidential and intended for administrative use only.",
                confidentialFont);
        conf.setAlignment(Paragraph.ALIGN_CENTER);
        conf.setSpacingAfter(15);
        document.add(conf);

        // Horizontal line
        Paragraph line = new Paragraph(new Chunk(new com.lowagie.text.pdf.draw.LineSeparator(1.5f, 100,
                new Color(33, 37, 41), Element.ALIGN_CENTER, -2)));
        line.setSpacingAfter(15);
        document.add(line);

        // Signatures Table
        PdfPTable sigTable = new PdfPTable(2);
        sigTable.setWidthPercentage(100);
        sigTable.setWidths(new float[] { 5f, 5f });

        Font titleFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(33, 37, 41));
        Font subtitleFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(108, 117, 125));

        // Left Column
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph leftTitle = new Paragraph(leftTitleStr, titleFont);
        leftTitle.setAlignment(Paragraph.ALIGN_CENTER);
        leftCell.addElement(leftTitle);

        Paragraph leftSubtitle = new Paragraph(leftSubStr, subtitleFont);
        leftSubtitle.setAlignment(Paragraph.ALIGN_CENTER);
        leftCell.addElement(leftSubtitle);

        Paragraph leftSig = new Paragraph("Signature: ______________________", subtitleFont);
        leftSig.setAlignment(Paragraph.ALIGN_CENTER);
        leftSig.setSpacingBefore(30);
        leftCell.addElement(leftSig);

        Paragraph leftDate = new Paragraph(
                "Date: " + LocalDate.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")), subtitleFont);
        leftDate.setAlignment(Paragraph.ALIGN_CENTER);
        leftCell.addElement(leftDate);

        sigTable.addCell(leftCell);

        // Right Column
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph rightTitle = new Paragraph(rightTitleStr, titleFont);
        rightTitle.setAlignment(Paragraph.ALIGN_CENTER);
        rightCell.addElement(rightTitle);

        Paragraph rightSubtitle = new Paragraph(rightSubStr, subtitleFont);
        rightSubtitle.setAlignment(Paragraph.ALIGN_CENTER);
        rightCell.addElement(rightSubtitle);

        Paragraph rightSig = new Paragraph("Signature: ______________________", subtitleFont);
        rightSig.setAlignment(Paragraph.ALIGN_CENTER);
        rightCell.addElement(rightSig);

        Paragraph rightDate = new Paragraph(
                "Date: " + LocalDate.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")), subtitleFont);
        rightDate.setAlignment(Paragraph.ALIGN_CENTER);
        rightCell.addElement(rightDate);

        sigTable.addCell(rightCell);

        document.add(sigTable);
        document.add(new Paragraph("\n\n"));

        // Bottom-most copyright line
        Font bottomFont = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(140, 140, 140));
        Paragraph bottom1 = new Paragraph("RURA - Regulatory Compliance & Verification Platform", bottomFont);
        bottom1.setAlignment(Paragraph.ALIGN_CENTER);
        document.add(bottom1);

        Paragraph bottom2 = new Paragraph("© " + LocalDate.now().getYear() + " All Rights Reserved", bottomFont);
        bottom2.setAlignment(Paragraph.ALIGN_CENTER);
        document.add(bottom2);
    }

    private String resolveLogoPath() {
        String[] paths = {
                "../frontend/public/logorura.png",
                "frontend/public/logorura.png",
                "./frontend/public/logorura.png",
                "logorura.png"
        };
        for (String p : paths) {
            java.io.File file = new java.io.File(p);
            if (file.exists() && file.isFile()) {
                log.info("RURA Logo found at: {}", file.getAbsolutePath());
                return file.getAbsolutePath();
            }
        }
        log.warn("RURA Logo not found in any standard path!");
        return null;
    }

    @Transactional(readOnly = true)
    public byte[] generateComplianceCertificate(UUID recordId) {
        log.info("Generating compliance certificate for record {}", recordId);

        ComplianceRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance Record not found: " + recordId));

        if (record.getStatus() != ComplianceStatus.COMPLIANT) {
            throw new ComplianceRuleViolationException(
                    "Certificate can only be generated for COMPLIANT records. Current status: " + record.getStatus());
        }

        Organization org = record.getOrganization();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 54, 54, 54, 54);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new CertificateBorder());
            document.open();

            // Logo
            String logoPath = resolveLogoPath();
            Image img = null;
            if (logoPath != null) {
                try {
                    img = Image.getInstance(logoPath);
                } catch (Exception ex) {
                    log.warn("Failed to load logo in certificate: " + ex.getMessage());
                }
            }

            if (img != null) {
                img.scaleToFit(140, 70);
                img.setAlignment(Image.ALIGN_CENTER);
                document.add(img);
                document.add(new Paragraph("\n"));
            }

            Font authorityFont = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(108, 117, 125));
            Paragraph auth = new Paragraph("RWANDA UTILITIES REGULATORY AUTHORITY", authorityFont);
            auth.setAlignment(Paragraph.ALIGN_CENTER);
            document.add(auth);

            Paragraph subAuth = new Paragraph("RegTech Compliance Verification Platform",
                    new Font(Font.HELVETICA, 10, Font.ITALIC, new Color(173, 181, 189)));
            subAuth.setAlignment(Paragraph.ALIGN_CENTER);
            document.add(subAuth);

            document.add(new Paragraph("\n"));

            Paragraph line = new Paragraph(new Chunk(new com.lowagie.text.pdf.draw.LineSeparator(1f, 100,
                    new Color(24, 76, 120), Element.ALIGN_CENTER, -2)));
            document.add(line);
            document.add(new Paragraph("\n"));

            Font titleFont = new Font(Font.HELVETICA, 22, Font.BOLD, new Color(33, 37, 41));
            Paragraph title = new Paragraph("CERTIFICATE OF COMPLIANCE", titleFont);
            title.setAlignment(Paragraph.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph("\n\n"));

            Font normalFont = new Font(Font.HELVETICA, 12, Font.NORMAL, new Color(73, 80, 87));
            Font boldValueFont = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(33, 37, 41));

            Paragraph certifyText = new Paragraph("This is to certify that", normalFont);
            certifyText.setAlignment(Paragraph.ALIGN_CENTER);
            document.add(certifyText);

            Paragraph orgName = new Paragraph(org.getName(),
                    new Font(Font.HELVETICA, 18, Font.BOLD, new Color(24, 76, 120)));
            orgName.setAlignment(Paragraph.ALIGN_CENTER);
            orgName.setSpacingBefore(5);
            orgName.setSpacingAfter(10);
            document.add(orgName);

            Paragraph meetText = new Paragraph(
                    "has successfully met all regulatory requirements and compliance standards for", normalFont);
            meetText.setAlignment(Paragraph.ALIGN_CENTER);
            document.add(meetText);

            Paragraph reqTitle = new Paragraph(record.getRequirement().getTitle(), boldValueFont);
            reqTitle.setAlignment(Paragraph.ALIGN_CENTER);
            reqTitle.setSpacingBefore(5);
            reqTitle.setSpacingAfter(20);
            document.add(reqTitle);

            document.add(new Paragraph("\n"));

            // Table of Details
            PdfPTable detailsTable = new PdfPTable(2);
            detailsTable.setWidthPercentage(80);
            detailsTable.setHorizontalAlignment(Element.ALIGN_CENTER);

            Font labelFont = new Font(Font.HELVETICA, 11, Font.BOLD, new Color(108, 117, 125));
            Font valueFont = new Font(Font.HELVETICA, 11, Font.NORMAL, new Color(33, 37, 41));

            addDetailRow(detailsTable, "Reporting Period:",
                    record.getReportingPeriodStart() + " to " + record.getReportingPeriodEnd(), labelFont, valueFont);
            addDetailRow(detailsTable, "Compliance Rating:", record.getComplianceScore() + "%", labelFont, valueFont);
            addDetailRow(detailsTable, "Status:", "EXCELLENT (COMPLIANT)", labelFont,
                    new Font(Font.HELVETICA, 11, Font.BOLD, new Color(25, 135, 84)));
            addDetailRow(detailsTable, "Certificate ID:", recordId.toString(), labelFont,
                    new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(108, 117, 125)));
            addDetailRow(detailsTable, "Date of Issue:", java.time.LocalDate.now().format(DateTimeFormatter.ISO_DATE),
                    labelFont, valueFont);

            document.add(detailsTable);

            document.add(new Paragraph("\n\n\n"));

            // Signature & Seal area
            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);

            PdfPCell leftSig = new PdfPCell();
            leftSig.setBorder(Rectangle.NO_BORDER);
            leftSig.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph sealText = new Paragraph("REGTECH VERIFIED\nOfficial Digital Seal",
                    new Font(Font.HELVETICA, 10, Font.BOLD, new Color(25, 135, 84)));
            sealText.setAlignment(Paragraph.ALIGN_CENTER);
            leftSig.addElement(sealText);
            sigTable.addCell(leftSig);

            PdfPCell rightSig = new PdfPCell();
            rightSig.setBorder(Rectangle.NO_BORDER);
            rightSig.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph signLine = new Paragraph("___________________________\nDirector General, RURA",
                    new Font(Font.HELVETICA, 10, Font.BOLD, new Color(33, 37, 41)));
            signLine.setAlignment(Paragraph.ALIGN_CENTER);
            rightSig.addElement(signLine);
            sigTable.addCell(rightSig);

            document.add(sigTable);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF certificate", e);
            throw new RuntimeException("Failed to generate PDF certificate", e);
        }
    }

    private void addDetailRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell1 = new PdfPCell(new Phrase(label, labelFont));
        cell1.setBorder(Rectangle.NO_BORDER);
        cell1.setPadding(6);
        table.addCell(cell1);

        PdfPCell cell2 = new PdfPCell(new Phrase(value, valueFont));
        cell2.setBorder(Rectangle.NO_BORDER);
        cell2.setPadding(6);
        table.addCell(cell2);
    }

    @Transactional(readOnly = true)
    public byte[] generateAdminReport(LocalDate startDate, LocalDate endDate) {
        log.info("Generating ADMIN compliance report for period {} to {}", startDate, endDate);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 72, 54);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new ReportHeaderFooter("EXECUTIVE SYSTEM REPORT", resolveLogoPath()));
            document.open();

            List<Organization> organizations = organizationRepository.findAll();
            List<ComplianceRecord> allRecords = recordRepository.findAll();
            List<Submission> allSubmissions = submissionRepository.findAll();

            if (startDate != null) {
                allRecords = allRecords.stream()
                        .filter(r -> r.getReportingPeriodEnd() != null
                                && !r.getReportingPeriodEnd().isBefore(startDate))
                        .collect(java.util.stream.Collectors.toList());
                allSubmissions = allSubmissions.stream()
                        .filter(s -> s.getSubmissionDate() != null
                                && !s.getSubmissionDate().toLocalDate().isBefore(startDate))
                        .collect(java.util.stream.Collectors.toList());
            }
            if (endDate != null) {
                allRecords = allRecords.stream()
                        .filter(r -> r.getReportingPeriodEnd() != null && !r.getReportingPeriodEnd().isAfter(endDate))
                        .collect(java.util.stream.Collectors.toList());
                allSubmissions = allSubmissions.stream()
                        .filter(s -> s.getSubmissionDate() != null
                                && !s.getSubmissionDate().toLocalDate().isAfter(endDate))
                        .collect(java.util.stream.Collectors.toList());
            }

            long totalOrgs = organizations.size();
            long totalRequirements = requirementRepository.count();
            long compliantCount = allRecords.stream()
                    .filter(r -> r.getStatus() == ComplianceStatus.COMPLIANT).count();
            long complianceRate = allRecords.isEmpty() ? 0 : (compliantCount * 100 / allRecords.size());
            long pendingSubmissions = allSubmissions.stream()
                    .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED).count();
            long activeAlerts = allRecords.stream()
                    .filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT).count();
            long pendingCount = allRecords.stream()
                    .filter(r -> r.getStatus() == ComplianceStatus.PENDING).count();

            // Metadata Block like the image
            Font metaTitleFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(33, 37, 41));
            Font metaValFont = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(73, 80, 87));

            Paragraph periodPara = new Paragraph();
            periodPara.add(new Chunk("PERIOD: ", metaTitleFont));
            String periodText = (startDate != null ? startDate.toString() : "2025-11-01") + " to "
                    + (endDate != null ? endDate.toString() : LocalDate.now().toString());
            periodPara.add(new Chunk(periodText + "\n", metaValFont));
            periodPara.add(new Chunk("ORGANIZATIONS: ", metaTitleFont));
            periodPara.add(new Chunk(String.valueOf(totalOrgs) + "\n\n", metaValFont));
            document.add(periodPara);

            // Document main table
            PdfPTable orgTable = new PdfPTable(6); // 6 columns like the image!
            orgTable.setWidthPercentage(100);
            orgTable.setWidths(new float[] { 2.5f, 1.8f, 2f, 1.7f, 1.3f, 1.3f });
            addStyledTableHeader(orgTable, "Organization", "Registration No", "Type", "Sector", "Status",
                    "Joined Date");

            for (int i = 0; i < organizations.size(); i++) {
                Organization org = organizations.get(i);
                List<ComplianceRecord> orgRecords = recordRepository.findByOrganizationId(org.getId());
                long orgCompliant = orgRecords.stream()
                        .filter(r -> r.getStatus() == ComplianceStatus.COMPLIANT).count();
                int rate = orgRecords.isEmpty() ? 0 : (int) (orgCompliant * 100 / orgRecords.size());

                String joinedDate = org.getCreatedAt() != null
                        ? org.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                        : LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

                boolean isLast = (i == organizations.size() - 1);
                addStyledTableRow(orgTable, isLast,
                        org.getName(),
                        org.getRegistrationNumber() != null ? org.getRegistrationNumber() : "-",
                        org.getType() != null ? org.getType().name() : "-",
                        org.getSector() != null ? org.getSector() : "-",
                        org.getStatus() != null ? org.getStatus().name() : "UNKNOWN",
                        joinedDate);
            }
            document.add(orgTable);
            document.add(new Paragraph("\n"));

            // Other compliance tracking details in the styled format
            addSectionTitle(document, "COMPLIANCE REQUIREMENTS SUMMARY");
            addKeyValueLine(document, "Total Requirements Defined", String.valueOf(totalRequirements));
            addKeyValueLine(document, "Overall Platform Compliance Score", complianceRate + "%");
            addKeyValueLine(document, "Non-Compliant Records (Active Alerts)", String.valueOf(activeAlerts));
            addKeyValueLine(document, "Pending Submissions Awaiting Review", String.valueOf(pendingSubmissions));
            document.add(new Paragraph("\n"));

            List<ComplianceRecord> deadlines = allRecords.stream()
                    .filter(r -> r.getReportingPeriodEnd() != null
                            && r.getReportingPeriodEnd().isAfter(LocalDate.now())
                            && r.getRequirement() != null)
                    .sorted((a, b) -> a.getReportingPeriodEnd().compareTo(b.getReportingPeriodEnd()))
                    .limit(15)
                    .toList();
            if (!deadlines.isEmpty()) {
                addSectionTitle(document, "UPCOMING DEADLINES");
                PdfPTable dlTable = new PdfPTable(4);
                dlTable.setWidthPercentage(100);
                dlTable.setWidths(new float[] { 3, 3, 2, 1.5f });
                addStyledTableHeader(dlTable, "Organization", "Requirement", "Due Date", "Status");
                for (int i = 0; i < deadlines.size(); i++) {
                    ComplianceRecord r = deadlines.get(i);
                    boolean isLast = (i == deadlines.size() - 1);
                    addStyledTableRow(dlTable, isLast,
                            r.getOrganization() != null ? r.getOrganization().getName() : "-",
                            r.getRequirement().getTitle(),
                            r.getReportingPeriodEnd().toString(),
                            r.getStatus() != null ? r.getStatus().name() : "PENDING");
                }
                document.add(dlTable);
            }
            document.add(new Paragraph("\n"));

            List<Submission> recentSubmissions = allSubmissions.stream()
                    .sorted((a, b) -> {
                        LocalDateTime aTime = a.getSubmissionDate() != null ? a.getSubmissionDate() : LocalDateTime.MIN;
                        LocalDateTime bTime = b.getSubmissionDate() != null ? b.getSubmissionDate() : LocalDateTime.MIN;
                        return bTime.compareTo(aTime);
                    })
                    .limit(20)
                    .toList();
            if (!recentSubmissions.isEmpty()) {
                addSectionTitle(document, "RECENT SUBMISSIONS");
                PdfPTable subTable = new PdfPTable(5);
                subTable.setWidthPercentage(100);
                subTable.setWidths(new float[] { 2.5f, 2.5f, 2, 1.5f, 1.5f });
                addStyledTableHeader(subTable, "Organization", "Requirement", "Submitted By", "Date", "Status");
                for (int i = 0; i < recentSubmissions.size(); i++) {
                    Submission s = recentSubmissions.get(i);
                    boolean isLast = (i == recentSubmissions.size() - 1);
                    String orgName = s.getComplianceRecord() != null
                            && s.getComplianceRecord().getOrganization() != null
                                    ? s.getComplianceRecord().getOrganization().getName()
                                    : "-";
                    String reqName = s.getComplianceRecord() != null && s.getComplianceRecord().getRequirement() != null
                            ? s.getComplianceRecord().getRequirement().getTitle()
                            : "-";
                    String userName = s.getSubmittedBy() != null ? s.getSubmittedBy().getFullName() : "-";
                    addStyledTableRow(subTable, isLast, orgName, reqName, userName,
                            s.getSubmissionDate() != null ? s.getSubmissionDate().toLocalDate().toString() : "-",
                            s.getStatus() != null ? s.getStatus().name() : "SUBMITTED");
                }
                document.add(subTable);
            }

            // Confidentiality and Signatures Section
            addReportFooterAndSignatures(document,
                    "SYSTEM ADMINISTRATOR", "RURA Compliance Platform",
                    "DIRECTOR GENERAL", "Rwanda Utilities Regulatory Authority");

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating admin PDF report", e);
            throw new RuntimeException("Failed to generate admin PDF report", e);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateEntityReport(UUID organizationId, LocalDate startDate, LocalDate endDate) {
        log.info("Generating ENTITY compliance report for organization {} for period {} to {}", organizationId,
                startDate, endDate);

        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 72, 54);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new ReportHeaderFooter("ORGANIZATION COMPLIANCE REPORT", resolveLogoPath()));
            document.open();

            List<ComplianceRecord> orgRecords = recordRepository.findByOrganizationId(organizationId);
            List<UUID> recordIds = orgRecords.stream().map(ComplianceRecord::getId).toList();
            List<Submission> submissions = recordIds.stream()
                    .flatMap(rid -> submissionRepository.findByComplianceRecordId(rid).stream())
                    .toList();

            if (startDate != null) {
                orgRecords = orgRecords.stream()
                        .filter(r -> r.getReportingPeriodEnd() != null
                                && !r.getReportingPeriodEnd().isBefore(startDate))
                        .collect(java.util.stream.Collectors.toList());
                submissions = submissions.stream()
                        .filter(s -> s.getSubmissionDate() != null
                                && !s.getSubmissionDate().toLocalDate().isBefore(startDate))
                        .collect(java.util.stream.Collectors.toList());
            }
            if (endDate != null) {
                orgRecords = orgRecords.stream()
                        .filter(r -> r.getReportingPeriodEnd() != null && !r.getReportingPeriodEnd().isAfter(endDate))
                        .collect(java.util.stream.Collectors.toList());
                submissions = submissions.stream()
                        .filter(s -> s.getSubmissionDate() != null
                                && !s.getSubmissionDate().toLocalDate().isAfter(endDate))
                        .collect(java.util.stream.Collectors.toList());
            }

            long compliantCount = orgRecords.stream()
                    .filter(r -> r.getStatus() == ComplianceStatus.COMPLIANT).count();
            long nonCompliantCount = orgRecords.stream()
                    .filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT).count();
            long pendingCount = orgRecords.stream()
                    .filter(r -> r.getStatus() == ComplianceStatus.PENDING).count();
            int complianceRate = orgRecords.isEmpty() ? 0 : (int) (compliantCount * 100 / orgRecords.size());
            long upcomingDeadlines = orgRecords.stream()
                    .filter(r -> r.getReportingPeriodEnd() != null
                            && r.getReportingPeriodEnd().isAfter(LocalDate.now())
                            && r.getReportingPeriodEnd().isBefore(LocalDate.now().plusDays(30)))
                    .count();
            long pendingSubmissions = submissions.stream()
                    .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED).count();

            // Metadata Block like the image
            Font metaTitleFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(33, 37, 41));
            Font metaValFont = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(73, 80, 87));

            Paragraph periodPara = new Paragraph();
            periodPara.add(new Chunk("PERIOD: ", metaTitleFont));
            String periodText = (startDate != null ? startDate.toString() : "2025-11-01") + " to "
                    + (endDate != null ? endDate.toString() : LocalDate.now().toString());
            periodPara.add(new Chunk(periodText + "\n", metaValFont));
            periodPara.add(new Chunk("ORGANIZATION: ", metaTitleFont));
            periodPara.add(new Chunk(org.getName() + "\n\n", metaValFont));
            document.add(periodPara);

            // Document main table (Compliance Records)
            if (!orgRecords.isEmpty()) {
                PdfPTable recTable = new PdfPTable(6); // 6 columns
                recTable.setWidthPercentage(100);
                recTable.setWidths(new float[] { 2.5f, 2f, 1.3f, 1.2f, 1.5f, 1.5f });
                addStyledTableHeader(recTable, "Requirement", "Regulation", "Frequency", "Score", "Status", "Due Date");
                for (int i = 0; i < orgRecords.size(); i++) {
                    ComplianceRecord r = orgRecords.get(i);
                    boolean isLast = (i == orgRecords.size() - 1);
                    String regTitle = r.getRequirement() != null && r.getRequirement().getRegulation() != null
                            ? r.getRequirement().getRegulation().getTitle()
                            : "-";
                    String freqName = r.getRequirement() != null && r.getRequirement().getFrequency() != null
                            ? r.getRequirement().getFrequency().name()
                            : "-";
                    addStyledTableRow(recTable, isLast,
                            r.getRequirement() != null ? r.getRequirement().getTitle() : "-",
                            regTitle,
                            freqName,
                            r.getComplianceScore() != null ? r.getComplianceScore() + "%" : "0%",
                            r.getStatus() != null ? r.getStatus().name() : "PENDING",
                            r.getReportingPeriodEnd() != null ? r.getReportingPeriodEnd().toString() : "-");
                }
                document.add(recTable);
            } else {
                document.add(new Paragraph("No compliance records found.", new Font(Font.HELVETICA, 10, Font.NORMAL)));
            }
            document.add(new Paragraph("\n"));

            // Other entity compliance details in styled key-value list
            addSectionTitle(document, "COMPLIANCE TRACKING SUMMARY");
            addKeyValueLine(document, "Sector", org.getSector() != null ? org.getSector() : "-");
            addKeyValueLine(document, "Registration Number",
                    org.getRegistrationNumber() != null ? org.getRegistrationNumber() : "-");
            addKeyValueLine(document, "Address Location", org.getAddress() != null ? org.getAddress() : "-");
            addKeyValueLine(document, "Overall Compliance Score", complianceRate + "%");
            addKeyValueLine(document, "Compliant Requirements", String.valueOf(compliantCount));
            addKeyValueLine(document, "Non-Compliant Requirements", String.valueOf(nonCompliantCount));
            addKeyValueLine(document, "Pending Requirements", String.valueOf(pendingCount));
            addKeyValueLine(document, "Upcoming Period Deadlines (30 days)", String.valueOf(upcomingDeadlines));
            addKeyValueLine(document, "Submissions Awaiting Auditor Review", String.valueOf(pendingSubmissions));
            document.add(new Paragraph("\n"));

            // Submissions table in styled layout
            if (!submissions.isEmpty()) {
                addSectionTitle(document, "SUBMISSIONS HISTORY");
                List<Submission> recentSubs = submissions.stream()
                        .sorted((a, b) -> {
                            LocalDateTime aTime = a.getSubmissionDate() != null ? a.getSubmissionDate()
                                    : LocalDateTime.MIN;
                            LocalDateTime bTime = b.getSubmissionDate() != null ? b.getSubmissionDate()
                                    : LocalDateTime.MIN;
                            return bTime.compareTo(aTime);
                        })
                        .limit(20)
                        .toList();
                PdfPTable subTable = new PdfPTable(4);
                subTable.setWidthPercentage(100);
                subTable.setWidths(new float[] { 3.5f, 2f, 2.5f, 2f });
                addStyledTableHeader(subTable, "Requirement", "Submitted By", "Submission Date", "Auditor Status");
                for (int i = 0; i < recentSubs.size(); i++) {
                    Submission s = recentSubs.get(i);
                    boolean isLast = (i == recentSubs.size() - 1);
                    String reqName = s.getComplianceRecord() != null && s.getComplianceRecord().getRequirement() != null
                            ? s.getComplianceRecord().getRequirement().getTitle()
                            : "-";
                    String userName = s.getSubmittedBy() != null ? s.getSubmittedBy().getFullName() : "-";
                    addStyledTableRow(subTable, isLast, reqName, userName,
                            s.getSubmissionDate() != null ? s.getSubmissionDate().toLocalDate().toString() : "-",
                            s.getStatus() != null ? s.getStatus().name() : "SUBMITTED");
                }
                document.add(subTable);
            }

            // Confidentiality and Signatures Section
            addReportFooterAndSignatures(document,
                    "REPRESENTATIVE", org.getName(),
                    "RURA AUDITOR", "Compliance Assurance Department");

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating entity PDF report", e);
            throw new RuntimeException("Failed to generate entity PDF report", e);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateAuditorReport(LocalDate startDate, LocalDate endDate) {
        log.info("Generating AUDITOR compliance report for period {} to {}", startDate, endDate);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 72, 54);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new ReportHeaderFooter("AUDITOR INSPECTION REPORT", resolveLogoPath()));
            document.open();

            List<Inspection> inspections = inspectionRepository.findAll();
            List<ComplianceRecord> allRecords = recordRepository.findAll();
            List<Submission> allSubmissions = submissionRepository.findAll();

            if (startDate != null) {
                inspections = inspections.stream()
                        .filter(i -> i.getScheduledDate() != null
                                && !i.getScheduledDate().toLocalDate().isBefore(startDate))
                        .collect(java.util.stream.Collectors.toList());
                allRecords = allRecords.stream()
                        .filter(r -> r.getReportingPeriodEnd() != null
                                && !r.getReportingPeriodEnd().isBefore(startDate))
                        .collect(java.util.stream.Collectors.toList());
                allSubmissions = allSubmissions.stream()
                        .filter(s -> s.getSubmissionDate() != null
                                && !s.getSubmissionDate().toLocalDate().isBefore(startDate))
                        .collect(java.util.stream.Collectors.toList());
            }
            if (endDate != null) {
                inspections = inspections.stream()
                        .filter(i -> i.getScheduledDate() != null
                                && !i.getScheduledDate().toLocalDate().isAfter(endDate))
                        .collect(java.util.stream.Collectors.toList());
                allRecords = allRecords.stream()
                        .filter(r -> r.getReportingPeriodEnd() != null && !r.getReportingPeriodEnd().isAfter(endDate))
                        .collect(java.util.stream.Collectors.toList());
                allSubmissions = allSubmissions.stream()
                        .filter(s -> s.getSubmissionDate() != null
                                && !s.getSubmissionDate().toLocalDate().isAfter(endDate))
                        .collect(java.util.stream.Collectors.toList());
            }

            long totalInspections = inspections.size();
            long completedInspections = inspections.stream()
                    .filter(i -> i.getStatus() == InspectionStatus.COMPLETED).count();
            long scheduledInspections = inspections.stream()
                    .filter(i -> i.getStatus() == InspectionStatus.SCHEDULED).count();
            long inProgressInspections = inspections.stream()
                    .filter(i -> i.getStatus() == InspectionStatus.IN_PROGRESS).count();
            long pendingReviews = allSubmissions.stream()
                    .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED).count();
            List<Submission> pendingSubs = allSubmissions.stream()
                    .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED)
                    .collect(java.util.stream.Collectors.toList());
            long compliantCount = allRecords.stream()
                    .filter(r -> r.getStatus() == ComplianceStatus.COMPLIANT).count();
            long nonCompliantCount = allRecords.stream()
                    .filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT).count();
            int complianceRate = allRecords.isEmpty() ? 0 : (int) (compliantCount * 100 / allRecords.size());

            // Metadata Block like the image
            Font metaTitleFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(33, 37, 41));
            Font metaValFont = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(73, 80, 87));

            Paragraph periodPara = new Paragraph();
            periodPara.add(new Chunk("PERIOD: ", metaTitleFont));
            String periodText = (startDate != null ? startDate.toString() : "2025-11-01") + " to "
                    + (endDate != null ? endDate.toString() : LocalDate.now().toString());
            periodPara.add(new Chunk(periodText + "\n", metaValFont));
            periodPara.add(new Chunk("INSPECTIONS: ", metaTitleFont));
            periodPara.add(new Chunk(String.valueOf(totalInspections) + "\n\n", metaValFont));
            document.add(periodPara);

            // Document main table (Inspections - 6 columns)
            if (!inspections.isEmpty()) {
                List<Inspection> sortedInspections = inspections.stream()
                        .sorted((a, b) -> {
                            LocalDateTime aTime = a.getScheduledDate() != null ? a.getScheduledDate()
                                    : LocalDateTime.MIN;
                            LocalDateTime bTime = b.getScheduledDate() != null ? b.getScheduledDate()
                                    : LocalDateTime.MIN;
                            return bTime.compareTo(aTime);
                        })
                        .limit(20)
                        .toList();
                PdfPTable inspTable = new PdfPTable(6); // 6 columns
                inspTable.setWidthPercentage(100);
                inspTable.setWidths(new float[] { 2.5f, 2f, 1.5f, 1.5f, 1.2f, 1.3f });
                addStyledTableHeader(inspTable, "Organization", "Inspector", "Sector", "Inspection Date", "Risk Level",
                        "Status");
                for (int i = 0; i < sortedInspections.size(); i++) {
                    Inspection insp = sortedInspections.get(i);
                    boolean isLast = (i == sortedInspections.size() - 1);
                    String orgSector = insp.getOrganization() != null && insp.getOrganization().getSector() != null
                            ? insp.getOrganization().getSector()
                            : "-";
                    String orgRisk = insp.getOrganization() != null && insp.getOrganization().getRiskLevel() != null
                            ? insp.getOrganization().getRiskLevel().name()
                            : "UNKNOWN";
                    addStyledTableRow(inspTable, isLast,
                            insp.getOrganization() != null ? insp.getOrganization().getName() : "-",
                            insp.getInspector() != null ? insp.getInspector().getFullName() : "-",
                            orgSector,
                            insp.getScheduledDate() != null ? insp.getScheduledDate().toLocalDate().toString() : "-",
                            orgRisk,
                            insp.getStatus() != null ? insp.getStatus().name() : "SCHEDULED");
                }
                document.add(inspTable);
            } else {
                document.add(new Paragraph("No inspections found.", new Font(Font.HELVETICA, 10, Font.NORMAL)));
            }
            document.add(new Paragraph("\n"));

            // Other auditor summary details in styled key-value list
            addSectionTitle(document, "INSPECTION & REVIEW METRICS");
            addKeyValueLine(document, "Completed Inspections", String.valueOf(completedInspections));
            addKeyValueLine(document, "Scheduled Inspections Awaiting Execution", String.valueOf(scheduledInspections));
            addKeyValueLine(document, "In-Progress Active Inspections", String.valueOf(inProgressInspections));
            addKeyValueLine(document, "Overall Platform Compliance Rate", complianceRate + "%");
            addKeyValueLine(document, "Platform Non-Compliant Audited Records", String.valueOf(nonCompliantCount));
            addKeyValueLine(document, "Submissions Awaiting Review", String.valueOf(pendingReviews));
            document.add(new Paragraph("\n"));

            // Compliance Overview by Organization table
            List<Organization> organizations = organizationRepository.findAll();
            if (!organizations.isEmpty()) {
                addSectionTitle(document, "COMPLIANCE OVERVIEW BY ORGANIZATION");
                PdfPTable orgTable = new PdfPTable(4);
                orgTable.setWidthPercentage(100);
                orgTable.setWidths(new float[] { 3.5f, 2.5f, 2f, 2f });
                addStyledTableHeader(orgTable, "Organization", "Sector", "Compliance", "Risk Level");
                for (int i = 0; i < organizations.size(); i++) {
                    Organization org = organizations.get(i);
                    boolean isLast = (i == organizations.size() - 1);
                    List<ComplianceRecord> orgRecords = recordRepository.findByOrganizationId(org.getId());
                    long orgCompliant = orgRecords.stream()
                            .filter(r -> r.getStatus() == ComplianceStatus.COMPLIANT).count();
                    int rate = orgRecords.isEmpty() ? 0 : (int) (orgCompliant * 100 / orgRecords.size());
                    addStyledTableRow(orgTable, isLast, org.getName(),
                            org.getSector() != null ? org.getSector() : "-",
                            rate + "%",
                            org.getRiskLevel() != null ? org.getRiskLevel().name() : "UNKNOWN");
                }
                document.add(orgTable);
            }
            document.add(new Paragraph("\n"));

            // Pending Submissions table
            if (!pendingSubs.isEmpty()) {
                addSectionTitle(document, "PENDING SUBMISSIONS");
                PdfPTable psubTable = new PdfPTable(4);
                psubTable.setWidthPercentage(100);
                psubTable.setWidths(new float[] { 2.5f, 3.5f, 2f, 2f });
                addStyledTableHeader(psubTable, "Organization", "Requirement", "Submitted By", "Submission Date");
                for (int i = 0; i < pendingSubs.size(); i++) {
                    Submission s = pendingSubs.get(i);
                    boolean isLast = (i == pendingSubs.size() - 1);
                    String orgName = s.getComplianceRecord() != null
                            && s.getComplianceRecord().getOrganization() != null
                                    ? s.getComplianceRecord().getOrganization().getName()
                                    : "-";
                    String reqName = s.getComplianceRecord() != null && s.getComplianceRecord().getRequirement() != null
                            ? s.getComplianceRecord().getRequirement().getTitle()
                            : "-";
                    String userName = s.getSubmittedBy() != null ? s.getSubmittedBy().getFullName() : "-";
                    addStyledTableRow(psubTable, isLast, orgName, reqName, userName,
                            s.getSubmissionDate() != null ? s.getSubmissionDate().toLocalDate().toString() : "-");
                }
                document.add(psubTable);
            }

            // Confidentiality and Signatures Section
            addReportFooterAndSignatures(document,
                    "LEAD AUDITOR / INSPECTOR", "RURA Compliance Division",
                    "HEAD OF DEPT / REVIEWER", "Rwanda Utilities Regulatory Authority");

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating auditor PDF report", e);
            throw new RuntimeException("Failed to generate auditor PDF report", e);
        }
    }

    public void addSubHeader(Document document, String text) throws DocumentException {
        Font font = new Font(Font.HELVETICA, 10, Font.ITALIC, new Color(108, 117, 125));
        Paragraph p = new Paragraph(text, font);
        p.setAlignment(Paragraph.ALIGN_CENTER);
        p.setSpacingAfter(12);
        document.add(p);
    }

    public void addSectionTitle(Document document, String title) throws DocumentException {
        Font sectionFont = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(24, 76, 120));
        Paragraph p = new Paragraph(title, sectionFont);
        p.setSpacingBefore(12);
        p.setSpacingAfter(6);
        document.add(p);
    }

    public void addKeyValueLine(Document document, String key, String value) throws DocumentException {
        Font keyFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(73, 80, 87));
        Font valFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
        Paragraph p = new Paragraph();
        p.add(new Chunk(key + ": ", keyFont));
        p.add(new Chunk(value, valFont));
        p.setSpacingAfter(2);
        document.add(p);
    }

    public void addTableHeader(PdfPTable table, String... headers) {
        Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(new Color(24, 76, 120)); // Corporate Dark Blue
            cell.setBorder(Rectangle.BOTTOM);
            cell.setBorderColor(new Color(18, 57, 90));
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_LEFT);
            table.addCell(cell);
        }
    }

    public void addTableRow(PdfPTable table, String... values) {
        Font cellFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(50, 50, 50));
        for (String v : values) {
            PdfPCell cell = new PdfPCell(new Phrase(v != null ? v : "", cellFont));
            cell.setPadding(6);
            cell.setBorder(Rectangle.BOTTOM);
            cell.setBorderColor(new Color(225, 225, 225));
            cell.setHorizontalAlignment(Element.ALIGN_LEFT);
            table.addCell(cell);
        }
    }
}
