package com.rura.regtech.service;

import com.rura.regtech.dto.response.SearchResultResponse;

public interface SearchService {
    SearchResultResponse search(String query);
}