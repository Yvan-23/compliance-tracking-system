package com.rura.regtech.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CompleteActionRequest {
    @NotBlank(message = "Evidence is required")
    private String evidence;
}
