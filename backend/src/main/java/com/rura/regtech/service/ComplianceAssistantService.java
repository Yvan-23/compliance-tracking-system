package com.rura.regtech.service;

import com.rura.regtech.dto.response.AssistantQueryResponse;

public interface ComplianceAssistantService {
    AssistantQueryResponse answerQuery(String query, Integer maxResults);
}
