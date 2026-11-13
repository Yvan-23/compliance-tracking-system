package com.rura.regtech.dto.request;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

@Data
public class PenaltyIssuanceRequest {
    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be positive")
    private double amount;
}
