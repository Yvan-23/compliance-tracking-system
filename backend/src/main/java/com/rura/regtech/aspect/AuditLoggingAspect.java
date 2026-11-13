package com.rura.regtech.aspect;

import com.rura.regtech.entity.AuditLog;
import com.rura.regtech.entity.User;
import com.rura.regtech.repository.AuditLogRepository;
import com.rura.regtech.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLoggingAspect {

    private final AuditLogRepository auditLogRepository;
    private final SecurityUtils securityUtils;

    @Pointcut("execution(* com.rura.regtech.service.impl..*(..))")
    public void serviceLayerExecution() {
    }

    @Pointcut("@annotation(org.springframework.transaction.annotation.Transactional)")
    public void transactionalMethods() {
    }

    @Pointcut("execution(* com.rura.regtech.service.impl.AuditLogServiceImpl.*(..))")
    public void auditLogService() {
    }

    @AfterReturning(pointcut = "serviceLayerExecution() && transactionalMethods() && !auditLogService()", returning = "result")
    public void logServiceMethod(JoinPoint joinPoint, Object result) {
        try {
            String className = joinPoint.getTarget().getClass().getSimpleName();
            String methodName = joinPoint.getSignature().getName();
            Object[] args = joinPoint.getArgs();

            String entityType = extractEntityType(className);
            String entityId = extractEntityId(args, result);
            String action = formatAction(className, methodName);
            String details = buildDetails(className, methodName, args, result);

            User currentUser = securityUtils.getCurrentUser();

            String ipAddress = null;
            try {
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null) {
                    HttpServletRequest request = attrs.getRequest();
                    ipAddress = request.getRemoteAddr();
                }
            } catch (Exception e) {
            }

            AuditLog auditLog = AuditLog.builder()
                    .user(currentUser)
                    .action(action)
                    .details(details)
                    .entityType(entityType)
                    .entityId(entityId)
                    .ipAddress(ipAddress)
                    .build();

            auditLogRepository.save(auditLog);

            log.debug("AUDIT: {} | {} | {} | {}", action, entityType, entityId,
                    currentUser != null ? currentUser.getEmail() : "system");
        } catch (Exception e) {
            log.error("Failed to create audit log", e);
        }
    }

    private String extractEntityType(String className) {
        if (className.endsWith("ServiceImpl")) {
            className = className.substring(0, className.length() - "ServiceImpl".length());
        } else if (className.endsWith("Service")) {
            className = className.substring(0, className.length() - "Service".length());
        }
        return className.toUpperCase();
    }

    private String extractEntityId(Object[] args, Object result) {
        for (Object arg : args) {
            if (arg instanceof UUID) {
                return arg.toString();
            }
            if (arg != null) {
                String s = arg.toString();
                if (s.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
                    return s;
                }
            }
        }
        if (result != null) {
            try {
                var idMethod = result.getClass().getMethod("getId");
                Object id = idMethod.invoke(result);
                if (id != null) return id.toString();
            } catch (Exception e) {
            }
        }
        return "N/A";
    }

    private String formatAction(String className, String methodName) {
        String cleanMethod = methodName.replaceAll("^[gs]et", "").replaceAll("(?<=[a-z])(?=[A-Z])", " ");
        if (methodName.startsWith("create") || methodName.startsWith("save") || methodName.startsWith("add")) {
            return "CREATE";
        } else if (methodName.startsWith("update") || methodName.startsWith("edit") || methodName.startsWith("modify")) {
            return "UPDATE";
        } else if (methodName.startsWith("delete") || methodName.startsWith("remove")) {
            return "DELETE";
        } else if (methodName.startsWith("approve")) {
            return "APPROVE";
        } else if (methodName.startsWith("reject")) {
            return "REJECT";
        } else if (methodName.startsWith("login")) {
            return "LOGIN";
        } else if (methodName.contains("register")) {
            return "REGISTER";
        } else if (methodName.startsWith("submit")) {
            return "SUBMIT";
        } else {
            return methodName.toUpperCase();
        }
    }

    private String buildDetails(String className, String methodName, Object[] args, Object result) {
        StringBuilder sb = new StringBuilder();
        sb.append(className).append(".").append(methodName);
        if (args.length > 0) {
            String params = Arrays.stream(args)
                    .filter(a -> a != null && !(a instanceof org.springframework.data.domain.Pageable))
                    .map(a -> {
                        String s = a.toString();
                        return s.length() > 100 ? s.substring(0, 100) + "..." : s;
                    })
                    .collect(Collectors.joining(", "));
            if (!params.isEmpty()) {
                sb.append(" | args: [").append(params).append("]");
            }
        }
        return sb.toString();
    }
}
