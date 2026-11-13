package com.rura.regtech.event;

/**
 * Event types for compliance system
 */
public class EventType {

    // User Events
    public static final String USER_LOGIN = "USER_LOGIN";
    public static final String USER_LOGOUT = "USER_LOGOUT";
    public static final String USER_CREATED = "USER_CREATED";
    public static final String USER_UPDATED = "USER_UPDATED";
    public static final String USER_DELETED = "USER_DELETED";

    // Organization Events
    public static final String ORGANIZATION_CREATED = "ORGANIZATION_CREATED";
    public static final String ORGANIZATION_UPDATED = "ORGANIZATION_UPDATED";
    public static final String ORGANIZATION_RISK_CHANGED = "ORGANIZATION_RISK_CHANGED";

    // Submission Events
    public static final String SUBMISSION_CREATED = "SUBMISSION_CREATED";
    public static final String SUBMISSION_SUBMITTED = "SUBMISSION_SUBMITTED";
    public static final String SUBMISSION_APPROVED = "SUBMISSION_APPROVED";
    public static final String SUBMISSION_REJECTED = "SUBMISSION_REJECTED";
    public static final String SUBMISSION_UPDATED = "SUBMISSION_UPDATED";

    // Inspection Events
    public static final String INSPECTION_SCHEDULED = "INSPECTION_SCHEDULED";
    public static final String INSPECTION_STARTED = "INSPECTION_STARTED";
    public static final String INSPECTION_COMPLETED = "INSPECTION_COMPLETED";
    public static final String FINDING_RECORDED = "FINDING_RECORDED";

    // Enforcement Events
    public static final String CORRECTIVE_ACTION_ISSUED = "CORRECTIVE_ACTION_ISSUED";
    public static final String CORRECTIVE_ACTION_COMPLETED = "CORRECTIVE_ACTION_COMPLETED";
    public static final String CORRECTIVE_ACTION_OVERDUE = "CORRECTIVE_ACTION_OVERDUE";
    public static final String PENALTY_CALCULATED = "PENALTY_CALCULATED";
    public static final String PENALTY_ISSUED = "PENALTY_ISSUED";
    public static final String PENALTY_PAID = "PENALTY_PAID";

    // Compliance Events
    public static final String COMPLIANCE_STATUS_CHANGED = "COMPLIANCE_STATUS_CHANGED";
    public static final String DEADLINE_APPROACHING = "DEADLINE_APPROACHING";
    public static final String DEADLINE_MISSED = "DEADLINE_MISSED";

    // Regulation Events
    public static final String REGULATION_CREATED = "REGULATION_CREATED";
    public static final String REGULATION_UPDATED = "REGULATION_UPDATED";
    public static final String REQUIREMENT_CREATED = "REQUIREMENT_CREATED";

    private EventType() {
        // Utility class
    }
}
