package com.rura.regtech.service;

public interface EmailService {
    void sendOtpEmail(String toEmail, String otp);
    void sendPasswordChangedNotification(String toEmail);
}