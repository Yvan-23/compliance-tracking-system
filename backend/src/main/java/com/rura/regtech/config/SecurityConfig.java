
package com.rura.regtech.config;

import org.springframework.security.core.userdetails.UserDetailsService;
import com.rura.regtech.security.JwtAuthenticationFilter;
import com.rura.regtech.security.OAuth2AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true, jsr250Enabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            UserDetailsService userDetailsService,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler,
            TenantFilter tenantFilter) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/oauth2/**").permitAll()
                        .requestMatchers("/login/oauth2/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/v1/profile/**").authenticated()
                        .requestMatchers("/api/v1/ai/**").hasAnyRole("ADMIN", "AUDITOR", "ENTITY")
                        .requestMatchers(HttpMethod.GET, "/api/v1/submissions/*/download").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/submissions/*/*/download").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/roles").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/users").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers("/api/v1/users/**").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/inspections/**").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasAnyRole("ADMIN", "ENTITY")
                        .requestMatchers("/api/compliance-recalculation/**").hasRole("ADMIN")
                        .requestMatchers("/api/compliance-state/**").hasAnyRole("ADMIN", "ENTITY")
                        .requestMatchers("/api/escalations/**").hasAnyRole("ADMIN", "ENTITY")
                        .requestMatchers("/api/risk-scoring/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/predictive-risk/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/compliance-snapshots/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/v1/audit-logs/**").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers("/api/v1/organizations/search").permitAll()
                        .requestMatchers("/api/v1/organizations/**").hasAnyRole("ADMIN", "AUDITOR", "ENTITY")
                        .requestMatchers("/api/v1/workflows/**").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers("/api/v1/enforcement/**").hasAnyRole("ADMIN", "AUDITOR", "ENTITY")
                        .requestMatchers("/api/v1/approvals/**").hasAnyRole("ADMIN", "AUDITOR", "ENTITY")
                        .requestMatchers(HttpMethod.POST, "/api/v1/inspections/**").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/inspections/**").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/inspections/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/v1/compliance/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/v1/requirements/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/v1/submissions/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/v1/regulations/**").hasAnyRole("ADMIN", "AUDITOR", "ENTITY")
                        .requestMatchers("/api/v1/evidence/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/v1/notifications/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/v1/dashboard/**").hasAnyRole("ADMIN", "ENTITY", "AUDITOR")
                        .requestMatchers("/api/v1/reports/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/reports/entity/**").hasAnyRole("ADMIN", "ENTITY")
                        .requestMatchers("/api/v1/reports/auditor/**").hasAnyRole("ADMIN", "AUDITOR")
                        .requestMatchers("/api/v1/reports/certificate/**").hasAnyRole("ADMIN", "AUDITOR", "ENTITY")
                        .anyRequest().authenticated())
                .authenticationProvider(authenticationProvider(userDetailsService))
                .oauth2Login(oauth2 -> oauth2
                        .successHandler(oAuth2AuthenticationSuccessHandler)
                        .failureUrl("http://localhost:5174/login?error=oauth2_error"))
                .addFilterBefore(tenantFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(
            UserDetailsService userDetailsService) {

        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());

        return authProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:4200"
        ));

        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Tenant-ID",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
        ));

        configuration.setExposedHeaders(Arrays.asList(
                "Content-Disposition",
                "X-Error"
        ));

        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
