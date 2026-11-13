package com.rura.regtech.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WaiverRequestDto {
    private boolean approved;
    @NotBlank(message = "Comment is required")
    private String comment;
}
