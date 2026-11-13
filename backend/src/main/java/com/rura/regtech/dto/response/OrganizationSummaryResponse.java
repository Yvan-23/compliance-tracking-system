package com.rura.regtech.dto.response;

import lombok.Data;
import java.util.UUID;

@Data
public class OrganizationSummaryResponse {
    private UUID id;
    private String name;
    private String type;
    private int compliance;
    private String status;
}