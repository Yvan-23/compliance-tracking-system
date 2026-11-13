package com.rura.regtech.service;

import com.rura.regtech.dto.response.LocationResponse;
import java.util.UUID;

public interface LocationService {
    LocationResponse geocodeAddress(String address);
    
    LocationResponse geocodeAddressWithFallback(String address);

    java.util.List<LocationResponse> geocodeAddressMultiple(String address);
    
    void updateOrganizationLocation(UUID organizationId, String address);
}
