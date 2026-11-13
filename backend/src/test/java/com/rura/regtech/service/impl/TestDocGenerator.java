package com.rura.regtech.service.impl;

import org.junit.jupiter.api.Test;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileWriter;
import javax.imageio.ImageIO;

public class TestDocGenerator {

    private static final String BASE_PATH = "../test-documents/";
    private static final String PDF_PATH = "../test-documents/pdf/";

    @Test
    void generateDocs() {
        try {
            // Ensure directories exist
            new File(BASE_PATH).mkdirs();
            new File(PDF_PATH).mkdirs();

            System.out.println("Generating test documents under: " + new File(BASE_PATH).getCanonicalPath());

            // 1. Water Utility Documents
            String waterAR = """
                    REPUBLIC OF RWANDA
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    WATER SERVICES REGULATORY COMPLIANCE REPORT
                    
                    Document Number: RURA-WT-2026-AR-1049
                    Organization Name: Test Water Utility Ltd
                    Registration Number: RW-2024-0001
                    TIN: 2003847591
                    Sector: WATER
                    Reporting Period: Year 2025
                    Issue Date: 2026-01-15
                    Expiry Date: 2026-12-31
                    
                    This annual compliance report is submitted by Test Water Utility Ltd to certify compliance with all technical, financial, and operational standards set forth under the Water Services Regulatory Framework.
                    
                    Compliance Status: Compliant
                    Assessed Score: 100.0
                    
                    Issued by: RURA Water Regulation Division
                    """;

            String waterQR = """
                    REPUBLIC OF RWANDA
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    WATER SERVICES QUARTERLY PERFORMANCE REPORT
                    
                    Document Number: RURA-WT-2026-QR-4012
                    Organization Name: Test Water Utility Ltd
                    Registration Number: RW-2024-0001
                    Sector: WATER
                    Reporting Period: Q4 2025
                    Issue Date: 2026-01-15
                    Expiry Date: 2026-04-15
                    
                    Operational performance metrics for water production, distribution network pressure, and customer service requests:
                    - System Availability: 99.8%
                    - Quality Standards Adherence: 100.0%
                    - Customer Complaints Resolved: 98.4%
                    
                    Compliance Status: Compliant
                    Issued by: RURA Quality Monitoring Unit
                    """;

            String waterSC = """
                    REPUBLIC OF RWANDA
                    MINISTRY OF INFRASTRUCTURE
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    WATER SERVICES SAFETY INSPECTION CERTIFICATE
                    
                    Certificate Number: RURA-WT-2026-SC-8092
                    Licensee Name: Test Water Utility Ltd
                    Registration Number: RW-2024-0001
                    Sector: WATER
                    Issue Date: 2026-01-20
                    Expiry Date: 2027-01-20
                    
                    This certifies that the water treatment plant and distribution facilities of Test Water Utility Ltd have undergone a comprehensive safety inspection and comply with all physical security, environmental health, and water quality safety standards.
                    
                    Compliance Status: Valid
                    Issued by: RURA Environmental Safety Department
                    """;

            generateAllFormats(waterAR, "water-annual-report");
            generateAllFormats(waterQR, "water-quarterly-report");
            generateAllFormats(waterSC, "water-safety-cert");

            // 2. Telecom Documents
            String telecomAR = """
                    REPUBLIC OF RWANDA
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    TELECOM REGULATORY COMPLIANCE REPORT
                    
                    Document Number: RURA-TEL-2026-AR-2038
                    Organization Name: Acme Telecommunications Ltd
                    Registration Number: RW-2024-0002
                    TIN: 2003847592
                    Sector: TELECOM
                    Reporting Period: Year 2025
                    Issue Date: 2026-01-15
                    Expiry Date: 2026-12-31
                    
                    This annual compliance report is submitted by Acme Telecommunications Ltd to certify compliance with all technical, financial, and operational standards set forth under the Telecom Regulatory Framework.
                    
                    Compliance Status: Compliant
                    Assessed Score: 100.0
                    
                    Issued by: RURA Telecom Regulation Division
                    """;

            String telecomQR = """
                    REPUBLIC OF RWANDA
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    TELECOM QUARTERLY PERFORMANCE REPORT
                    
                    Document Number: RURA-TEL-2026-QR-5023
                    Organization Name: Acme Telecommunications Ltd
                    Registration Number: RW-2024-0002
                    Sector: TELECOM
                    Reporting Period: Q4 2025
                    Issue Date: 2026-01-15
                    Expiry Date: 2026-04-15
                    
                    Operational performance metrics for telecom infrastructure, packet loss, and latency monitoring:
                    - Network Availability: 99.9%
                    - Quality Standards Adherence: 100.0%
                    
                    Compliance Status: Compliant
                    Issued by: RURA Quality Monitoring Unit
                    """;

            String telecomSC = """
                    REPUBLIC OF RWANDA
                    MINISTRY OF INFRASTRUCTURE
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    TELECOM SAFETY INSPECTION CERTIFICATE
                    
                    Certificate Number: RURA-TEL-2026-SC-9041
                    Licensee Name: Acme Telecommunications Ltd
                    Registration Number: RW-2024-0002
                    Sector: TELECOM
                    Issue Date: 2026-01-20
                    Expiry Date: 2027-01-20
                    
                    This certifies that the telecom transmission towers and datacenter facilities of Acme Telecommunications Ltd have undergone a comprehensive safety inspection and comply with all physical security, radiation safety, and structural integrity standards.
                    
                    Compliance Status: Valid
                    Issued by: RURA Infrastructure Safety Department
                    """;

            generateAllFormats(telecomAR, "telecom-annual-report");
            generateAllFormats(telecomQR, "telecom-quarterly-report");
            generateAllFormats(telecomSC, "telecom-safety-cert");

            // 3. Electricity / Utility Documents
            String elecAR = """
                    REPUBLIC OF RWANDA
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    ELECTRICITY REGULATORY COMPLIANCE REPORT
                    
                    Document Number: RURA-EL-2026-AR-3094
                    Organization Name: Energy Rwanda Ltd
                    Registration Number: RW-2024-0003
                    TIN: 2003847593
                    Sector: UTILITY
                    Reporting Period: Year 2025
                    Issue Date: 2026-01-15
                    Expiry Date: 2026-12-31
                    
                    This annual compliance report is submitted by Energy Rwanda Ltd to certify compliance with all technical, financial, and operational standards set forth under the Electricity Regulatory Framework.
                    
                    Compliance Status: Compliant
                    Assessed Score: 100.0
                    
                    Issued by: RURA Energy Regulation Division
                    """;

            String elecQR = """
                    REPUBLIC OF RWANDA
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    ELECTRICITY QUARTERLY PERFORMANCE REPORT
                    
                    Document Number: RURA-EL-2026-QR-6045
                    Organization Name: Energy Rwanda Ltd
                    Registration Number: RW-2024-0003
                    Sector: UTILITY
                    Reporting Period: Q4 2025
                    Issue Date: 2026-01-15
                    Expiry Date: 2026-04-15
                    
                    Operational performance metrics for electrical grid substation operations, line outages, and voltage compliance:
                    - Grid Uptime Uptime: 99.7%
                    - Voltage Regulation: 99.5%
                    
                    Compliance Status: Compliant
                    Issued by: RURA Grid Performance Unit
                    """;

            String elecSC = """
                    REPUBLIC OF RWANDA
                    MINISTRY OF INFRASTRUCTURE
                    RWANDA UTILITIES REGULATORY AUTHORITY (RURA)
                    ELECTRICITY SAFETY INSPECTION CERTIFICATE
                    
                    Certificate Number: RURA-EL-2026-SC-7052
                    Licensee Name: Energy Rwanda Ltd
                    Registration Number: RW-2024-0003
                    Sector: UTILITY
                    Issue Date: 2026-01-20
                    Expiry Date: 2027-01-20
                    
                    This certifies that the electrical substations and distribution facilities of Energy Rwanda Ltd have undergone a comprehensive safety inspection and comply with all physical security, high-voltage equipment safety, and grid reliability standards.
                    
                    Compliance Status: Valid
                    Issued by: RURA Safety and Grid Reliability Unit
                    """;

            generateAllFormats(elecAR, "electricity-annual-report");
            generateAllFormats(elecQR, "electricity-quarterly-report");
            generateAllFormats(elecSC, "electricity-safety-cert");

            // 4. Canalbox ICT Documents
            String[] ictFiles = {
                "canalbox-business-license",
                "canalbox-tax-clearance",
                "canalbox-operating-permit",
                "canalbox-insurance-certificate",
                "canalbox-registration-certificate",
                "canalbox-qos-report",
                "canalbox-environmental-certificate"
            };
            for (String file : ictFiles) {
                File txtFile = new File(BASE_PATH + file + ".txt");
                if (txtFile.exists()) {
                    String content = new String(java.nio.file.Files.readAllBytes(txtFile.toPath()), java.nio.charset.StandardCharsets.UTF_8);
                    writePdfFile(content, PDF_PATH + file + ".pdf");
                    writeImageFile(content, BASE_PATH + file + ".png", "png");
                    writeImageFile(content, BASE_PATH + file + ".gif", "gif");
                    System.out.println("Programmatically generated PDF, PNG, and GIF for: " + file);
                } else {
                    System.out.println("Skipped " + file + " because source text file does not exist.");
                }

                // Delete old pdfgear files if they exist
                File pdfgearFile = new File(PDF_PATH + file + "(pdfgear.com).pdf");
                if (pdfgearFile.exists()) {
                    boolean deleted = pdfgearFile.delete();
                    if (deleted) {
                        System.out.println("Deleted old pdfgear file: " + pdfgearFile.getName());
                    }
                }
            }

            System.out.println("Successfully generated all test documents in text, PDF, PNG, and GIF formats.");

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to generate test documents", e);
        }
    }

    private void generateAllFormats(String content, String baseFilename) throws Exception {
        // 1. Text file
        writeTextFile(content, BASE_PATH + baseFilename + ".txt");

        // 2. PDF file
        writePdfFile(content, PDF_PATH + baseFilename + ".pdf");

        // 3. PNG Image
        writeImageFile(content, BASE_PATH + baseFilename + ".png", "png");

        // 4. GIF Image
        writeImageFile(content, BASE_PATH + baseFilename + ".gif", "gif");
    }

    private void writeTextFile(String content, String filePath) throws Exception {
        try (FileWriter writer = new FileWriter(filePath)) {
            writer.write(content);
        }
        System.out.println("Created: " + filePath);
    }

    private void writePdfFile(String content, String filePath) throws Exception {
        com.lowagie.text.Document document = new com.lowagie.text.Document();
        com.lowagie.text.pdf.PdfWriter.getInstance(document, new java.io.FileOutputStream(filePath));
        document.open();

        com.lowagie.text.Font titleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 16, com.lowagie.text.Font.BOLD);
        com.lowagie.text.Font bodyFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 11, com.lowagie.text.Font.NORMAL);

        String[] lines = content.split("\n");
        boolean isFirst = true;

        for (String line : lines) {
            if (line.trim().isEmpty()) {
                document.add(new com.lowagie.text.Paragraph(" "));
                continue;
            }
            if (isFirst) {
                document.add(new com.lowagie.text.Paragraph(line, titleFont));
                isFirst = false;
            } else {
                document.add(new com.lowagie.text.Paragraph(line, bodyFont));
            }
        }
        document.close();
        System.out.println("Created: " + filePath);
    }

    private void writeImageFile(String content, String filePath, String format) throws Exception {
        String[] lines = content.split("\n");
        int width = 800;
        int height = 40 + (lines.length * 24);

        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = img.createGraphics();

        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, width, height);

        g2d.setColor(Color.BLACK);
        g2d.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 15));
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        int y = 30;
        for (String line : lines) {
            g2d.drawString(line, 40, y);
            y += 24;
        }
        g2d.dispose();

        ImageIO.write(img, format, new File(filePath));
        System.out.println("Created: " + filePath);
    }
}
