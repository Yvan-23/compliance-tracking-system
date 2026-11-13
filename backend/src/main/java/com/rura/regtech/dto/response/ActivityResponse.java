package com.rura.regtech.dto.response;

import lombok.Data;

@Data
public class ActivityResponse {
    private String type;
    private String title;
    private String organization;
    private String time;
    private String status;
}