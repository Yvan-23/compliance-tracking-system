package com.rura.regtech.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

/**
 * Request DTO for partial user updates (PATCH)
 * All fields are optional - only non-null fields will be updated
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPatchRequest {

    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Email(message = "Email should be valid")
    private String email;

    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$", message = "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character")
    private String password;

    @Pattern(regexp = "^\\+2507[8932]\\d{7}$", message = "Phone number must be a valid Rwanda number starting with +25078, +25079, +25073, or +25072 followed by 7 digits")
    private String phoneNumber;

    private UUID organizationId;

    private Set<UUID> roleIds;

    private String status; // ACTIVE, INACTIVE, etc.
}
