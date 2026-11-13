package com.rura.regtech.mapper;

import com.rura.regtech.dto.response.OrganizationResponse;
import com.rura.regtech.entity.Organization;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface OrganizationMapper {

    default OrganizationResponse toResponse(Organization organization) {
        if (organization == null) {
            return null;
        }

        return new OrganizationResponse(
                organization.getId(),
                organization.getName(),
                organization.getType(),
                organization.getSector(),
                organization.getRegistrationNumber(),
                organization.getAddress(),
                organization.getLatitude(),
                organization.getLongitude(),
                organization.getLocationSource(),
                organization.getStatus(),
                organization.getRiskScore(),
                organization.getRiskLevel(),
                organization.getCreatedAt(),
                organization.getUpdatedAt());
    }
}
