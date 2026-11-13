package com.rura.regtech.dto.response;

import lombok.Data;

@Data
public class DeadlineResponse {
    private String requirement;
    private String organization;
    private String dueDate;
    private String status;
}