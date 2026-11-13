package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.LocationResponse;
import com.rura.regtech.entity.Organization;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.service.LocationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationServiceImpl implements LocationService {

    private final OrganizationRepository organizationRepository;
    private final RestTemplate restTemplate;

    @Value("${location.nominatim.base-url:https://nominatim.openstreetmap.org}")
    private String nominatimBaseUrl;

    @Value("${location.nominatim.user-agent:CoquelinCompliancePlatform}")
    private String userAgent;

    @Override
    public LocationResponse geocodeAddress(String address) {
        return geocodeWithNominatim(address);
    }

    @Override
    public LocationResponse geocodeAddressWithFallback(String address) {
        LocationResponse response = geocodeWithNominatim(address);
        
        if (!response.isSuccess()) {
            log.warn("Primary geocoding failed for: {}. Attempting fallback with Rwanda focus.", address);
            response = geocodeWithRwandaFocus(address);
        }
        
        return response;
    }

    @Override
    public java.util.List<LocationResponse> geocodeAddressMultiple(String address) {
        try {
            String searchAddress = address.contains("Rwanda") ? address : address + ", Rwanda";

            URI uri = UriComponentsBuilder.fromHttpUrl(nominatimBaseUrl + "/search")
                    .queryParam("q", searchAddress)
                    .queryParam("format", "json")
                    .queryParam("limit", 5)
                    .queryParam("countrycodes", "rw")
                    .queryParam("addressdetails", 1)
                    .build()
                    .toUri();

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", userAgent);
            org.springframework.http.HttpEntity<?> entity = new org.springframework.http.HttpEntity<>(headers);

            org.springframework.http.ResponseEntity<List> response = restTemplate.exchange(
                    uri, org.springframework.http.HttpMethod.GET, entity, List.class);

            java.util.List<LocationResponse> results = new java.util.ArrayList<>();
            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    Map<String, Object> result = (Map<String, Object>) item;
                    Double lat = Double.parseDouble((String) result.get("lat"));
                    Double lon = Double.parseDouble((String) result.get("lon"));
                    String displayName = (String) result.get("display_name");

                    Map<String, Object> addressData = (Map<String, Object>) result.get("address");
                    String city = addressData != null ? (String) addressData.get("city") : null;
                    if (city == null && addressData != null) city = (String) addressData.get("town");
                    if (city == null && addressData != null) city = (String) addressData.get("village");
                    if (city == null && addressData != null) city = (String) addressData.get("suburb");
                    String country = addressData != null ? (String) addressData.get("country") : "Rwanda";

                    results.add(LocationResponse.builder()
                            .latitude(lat)
                            .longitude(lon)
                            .formattedAddress(displayName)
                            .city(city)
                            .country(country)
                            .source("OpenStreetMap/Nominatim")
                            .success(true)
                            .build());
                }
            }
            return results;
        } catch (Exception e) {
            log.error("Error in multi-result geocoding: {}", e.getMessage());
            return java.util.Collections.emptyList();
        }
    }

    @Override
    public void updateOrganizationLocation(UUID organizationId, String address) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        LocationResponse location = geocodeAddressWithFallback(address);
        
        if (location.isSuccess()) {
            organization.setLatitude(location.getLatitude());
            organization.setLongitude(location.getLongitude());
            organization.setLocationSource(location.getSource());
            organizationRepository.save(organization);
            log.info("Updated organization {} location: lat={}, lng={}", 
                    organizationId, location.getLatitude(), location.getLongitude());
        } else {
            log.warn("Could not geocode address for organization {}: {}", organizationId, location.getErrorMessage());
        }
    }

    private LocationResponse geocodeWithNominatim(String address) {
        try {
            String searchAddress = address.contains("Rwanda") ? address : address + ", Rwanda";
            
            URI uri = UriComponentsBuilder.fromHttpUrl(nominatimBaseUrl + "/search")
                    .queryParam("q", searchAddress)
                    .queryParam("format", "json")
                    .queryParam("limit", 1)
                    .queryParam("addressdetails", 1)
                    .build()
                    .toUri();

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", userAgent);
            
            org.springframework.http.HttpEntity<?> entity = new org.springframework.http.HttpEntity<>(headers);
            
            org.springframework.http.ResponseEntity<List> response = restTemplate.exchange(
                    uri,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    List.class
            );

            if (response.getBody() != null && !response.getBody().isEmpty()) {
                Map<String, Object> result = (Map<String, Object>) response.getBody().get(0);
                
                Double lat = Double.parseDouble((String) result.get("lat"));
                Double lon = Double.parseDouble((String) result.get("lon"));
                
                Map<String, Object> addressData = (Map<String, Object>) result.get("address");
                String city = addressData != null ? (String) addressData.get("city") : null;
                if (city == null) city = (String) addressData.get("town");
                if (city == null) city = (String) addressData.get("village");
                String country = addressData != null ? (String) addressData.get("country") : null;

                return LocationResponse.builder()
                        .latitude(lat)
                        .longitude(lon)
                        .formattedAddress((String) result.get("display_name"))
                        .city(city)
                        .country(country)
                        .source("OpenStreetMap/Nominatim")
                        .success(true)
                        .build();
            }

            return LocationResponse.builder()
                    .success(false)
                    .errorMessage("No results found for address: " + address)
                    .build();

        } catch (Exception e) {
            log.error("Error geocoding address with Nominatim: {}", e.getMessage());
            return LocationResponse.builder()
                    .success(false)
                    .errorMessage("Geocoding failed: " + e.getMessage())
                    .build();
        }
    }

    private LocationResponse geocodeWithRwandaFocus(String address) {
        try {
            String searchQuery = address + ", Rwanda";
            
            URI uri = UriComponentsBuilder.fromHttpUrl(nominatimBaseUrl + "/search")
                    .queryParam("q", searchQuery)
                    .queryParam("format", "json")
                    .queryParam("limit", 1)
                    .queryParam("countrycodes", "rw")
                    .build()
                    .toUri();

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", userAgent);
            
            org.springframework.http.HttpEntity<?> entity = new org.springframework.http.HttpEntity<>(headers);
            
            org.springframework.http.ResponseEntity<List> response = restTemplate.exchange(
                    uri,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    List.class
            );

            if (response.getBody() != null && !response.getBody().isEmpty()) {
                Map<String, Object> result = (Map<String, Object>) response.getBody().get(0);
                
                return LocationResponse.builder()
                        .latitude(Double.parseDouble((String) result.get("lat")))
                        .longitude(Double.parseDouble((String) result.get("lon")))
                        .formattedAddress((String) result.get("display_name"))
                        .city(address)
                        .country("Rwanda")
                        .source("OpenStreetMap/Nominatim")
                        .success(true)
                        .build();
            }

            return LocationResponse.builder()
                    .success(false)
                    .errorMessage("No location found in Rwanda for: " + address)
                    .build();

        } catch (Exception e) {
            log.error("Error in fallback geocoding: {}", e.getMessage());
            return LocationResponse.builder()
                    .success(false)
                    .errorMessage("Fallback geocoding failed: " + e.getMessage())
                    .build();
        }
    }
}
