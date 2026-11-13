package com.rura.regtech;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
@EnableAspectJAutoProxy
public class ComplianceTrackerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ComplianceTrackerApplication.class, args);
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.boot.CommandLineRunner dropConstraint(org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_status_check");
                System.out.println("Successfully dropped constraint corrective_actions_status_check");
            } catch (Exception e) {
                System.err.println("Could not drop constraint: " + e.getMessage());
            }
        };
    }

}
