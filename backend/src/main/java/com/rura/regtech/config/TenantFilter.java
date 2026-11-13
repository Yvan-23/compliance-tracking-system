package com.rura.regtech.config;

import com.rura.regtech.security.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TenantFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            String tenantId = null;

            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7);
                if (jwtTokenProvider.validateToken(token)) {
                    tenantId = jwtTokenProvider.extractTenantId(token);
                }
            }

            // Only trust tenant from JWT, not from X-Tenant-ID header (prevents spoofing)
            if (tenantId != null) {
                try {
                    TenantContext.setTenantId(UUID.fromString(tenantId));
                } catch (IllegalArgumentException e) {
                    TenantContext.clear();
                }
            } else {
                TenantContext.clear();
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
