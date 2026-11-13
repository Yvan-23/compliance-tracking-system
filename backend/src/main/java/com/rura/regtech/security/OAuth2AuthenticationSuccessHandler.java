package com.rura.regtech.security;

import com.rura.regtech.entity.Role;
import com.rura.regtech.entity.User;
import com.rura.regtech.entity.enums.RoleName;
import com.rura.regtech.entity.enums.UserStatus;
import com.rura.regtech.repository.RoleRepository;
import com.rura.regtech.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JwtTokenProvider tokenProvider;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        log.info("Google OAuth2 login for: {}", email);

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            Role entityRole = roleRepository.findByName(RoleName.ENTITY).orElse(null);
            
            user = User.builder()
                    .fullName(name != null ? name : email)
                    .email(email)
                    .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                    .status(UserStatus.ACTIVE)
                    .build();
            
            if (entityRole != null) {
                user.setRoles(Set.of(entityRole));
            }
            
            user = userRepository.save(user);
            log.info("New user created via Google OAuth2: {}", email);
        }

        Set<String> roleNames = user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet());
        
        String rolesStr = String.join(",", roleNames);

        String orgId = user.getOrganization() != null ? user.getOrganization().getId().toString() : "";
        String accessToken = tokenProvider.generateTokenWithTenant(email, roleNames, orgId, user.getFullName());
        String refreshToken = tokenProvider.generateRefreshToken(email);

        String redirectUrl = "http://localhost:5173/dashboard?" + 
                "accessToken=" + accessToken +
                "&refreshToken=" + refreshToken +
                "&userId=" + user.getId() +
                "&userName=" + java.net.URLEncoder.encode(user.getFullName(), "UTF-8") +
                "&email=" + java.net.URLEncoder.encode(user.getEmail(), "UTF-8") +
                "&roles=" + rolesStr +
                "&organizationId=" + orgId;

        log.info("Redirecting to frontend with tokens for: {}", email);
        response.sendRedirect(redirectUrl);
    }
}