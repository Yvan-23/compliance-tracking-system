package com.rura.regtech.controller;

import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.SearchResultResponse;
import com.rura.regtech.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Slf4j
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<ApiResponse<SearchResultResponse>> globalSearch(@RequestParam String query) {
        log.info("Global search query: {}", query);
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(new ApiResponse<>(true, "Search results", new SearchResultResponse()));
        }
        SearchResultResponse results = searchService.search(query.trim());
        return ResponseEntity.ok(new ApiResponse<>(true, "Search results fetched successfully", results));
    }
}