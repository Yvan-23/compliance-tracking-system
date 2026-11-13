package com.rura.regtech.mapper;

import com.rura.regtech.dto.response.RoleResponse;
import com.rura.regtech.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RoleMapper {

    default RoleResponse toResponse(Role role) {
        if (role == null) {
            return null;
        }

        return new RoleResponse(
                role.getId(),
                role.getName() != null ? role.getName().name() : null);
    }
}
