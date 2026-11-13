package com.rura.regtech.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OrganizationRequest {
    @NotBlank(message = "Name is required")
    private String name;
    @NotBlank(message = "Type is required")
    private String type;
    @NotBlank(message = "Sector is required")
    private String sector;
    @NotBlank(message = "Registration number is required")
    private String registrationNumber;
    private String address;
    private Double latitude;
    private Double longitude;
    private String locationSource;
}
