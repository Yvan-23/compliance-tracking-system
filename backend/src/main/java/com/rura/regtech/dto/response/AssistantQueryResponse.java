package com.rura.regtech.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantQueryResponse {
    private String answer;
    private List<DocumentReference> references;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentReference {
        private String type;
        private String id;
        private String title;
        private String summary;
    }
}
