
package com.rura.regtech.service.impl;

import com.rura.regtech.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:myvan7755@gmail.com}")
    private String fromEmail;

    @Value("${app.email.enabled:true}")
    private boolean emailEnabled;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendOtpEmail(String toEmail, String otp) {

        if (!emailEnabled) {
            throw new IllegalStateException(
                    "Email sending is disabled in application.properties");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();

            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Password Reset OTP - Regulatory Compliance Tracker");

            message.setText(
                    "Dear User,\n\n" +
                    "You requested a password reset for your Regulatory Compliance Tracking account.\n\n" +
                    "Your OTP is: " + otp + "\n\n" +
                    "This OTP will expire in 10 minutes.\n\n" +
                    "If you did not request this, please ignore this email.\n\n" +
                    "Best regards,\n" +
                    "Coquelin Team"
            );

            mailSender.send(message);

            log.info("OTP email successfully submitted to mail server for: {}", toEmail);

        } catch (Exception e) {

            log.error("Failed to send OTP email to: {}", toEmail, e);

            throw new RuntimeException(
                    "Unable to send OTP email. Please try again later.", e);
        }
    }

    @Override
    public void sendPasswordChangedNotification(String toEmail) {

        if (!emailEnabled) {
            log.warn("Email notifications are disabled.");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();

            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Password Changed - Coquelin");

            message.setText(
                    "Dear User,\n\n" +
                    "Your password has been successfully changed.\n\n" +
                    "If you did not change your password, please contact support immediately.\n\n" +
                    "Best regards,\n" +
                    "Coquelin Team"
            );

            mailSender.send(message);

            log.info("Password change notification submitted for: {}", toEmail);

        } catch (Exception e) {

            log.error("Failed to send password change notification to: {}", toEmail, e);
        }
    }
}
