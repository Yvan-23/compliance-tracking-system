package com.rura.regtech.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequirementResult {
    private UUID id;
    private String title;
    private String regulationTitle;
    private String frequency;
}