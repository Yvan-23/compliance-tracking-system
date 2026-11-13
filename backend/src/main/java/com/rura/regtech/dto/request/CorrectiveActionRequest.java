package com.rura.regtech.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CorrectiveActionRequest {
    @NotBlank(message = "Description is required")
    private String description;
    private UUID findingId;
}
