package com.rura.regtech.exception;

import com.rura.regtech.dto.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(Exception.class)
        public ResponseEntity<?> handleException(Exception ex, HttpServletRequest request) {
                String uri = request.getRequestURI();
                if (uri != null && (uri.contains("/download") || uri.contains("/pdf") || uri.contains("/reports"))) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                                        .header("X-Error", "true")
                                        .body(ex.getMessage());
                }
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .body(new ApiResponse<>(false, "An unexpected error occurred: " + ex.getMessage(),
                                                null));
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(
                        MethodArgumentNotValidException ex) {
                Map<String, String> errors = new HashMap<>();
                ex.getBindingResult().getFieldErrors()
                                .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .body(new ApiResponse<>(false, "Validation failed", errors));
        }

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<?> handleResourceNotFoundException(ResourceNotFoundException ex, HttpServletRequest request) {
                String uri = request.getRequestURI();
                if (uri != null && (uri.contains("/download") || uri.contains("/pdf") || uri.contains("/reports"))) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                        .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                                        .header("X-Error", "true")
                                        .body(ex.getMessage());
                }
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .body(new ApiResponse<>(false, ex.getMessage(), null));
        }

        @ExceptionHandler(UnauthorizedOperationException.class)
        public ResponseEntity<ApiResponse<Void>> handleUnauthorizedOperationException(
                        UnauthorizedOperationException ex) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .body(new ApiResponse<>(false, ex.getMessage(), null));
        }

        @ExceptionHandler(ComplianceRuleViolationException.class)
        public ResponseEntity<ApiResponse<Void>> handleComplianceRuleViolationException(
                        ComplianceRuleViolationException ex) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .body(new ApiResponse<>(false, ex.getMessage(), null));
        }

        @ExceptionHandler(java.nio.file.FileSystemException.class)
        public ResponseEntity<ApiResponse<Void>> handleFileSystemException(java.nio.file.FileSystemException ex) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .body(new ApiResponse<>(false, "File upload failed: " + ex.getMessage(), null));
        }

        @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
        public ResponseEntity<ApiResponse<Void>> handleMaxUploadSizeExceededException(
                        org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .body(new ApiResponse<>(false, "File size exceeds the allowable limit.", null));
        }

        @ExceptionHandler(RuntimeException.class)
        public ResponseEntity<?> handleRuntimeException(RuntimeException ex, HttpServletRequest request) {
                String uri = request.getRequestURI();
                if (uri != null && (uri.contains("/download") || uri.contains("/pdf") || uri.contains("/reports"))) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                                        .header("X-Error", "true")
                                        .body(ex.getMessage());
                }
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .body(new ApiResponse<>(false, ex.getMessage(), null));
        }
}
