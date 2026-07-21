package com.example.scaffy.config;

import com.example.scaffy.model.User;
import com.example.scaffy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${scaffy.admin.email}")   private String adminEmail;
    @Value("${scaffy.admin.username}") private String adminUsername;
    @Value("${scaffy.admin.password}") private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (!userRepository.existsByRole("ADMIN")) {
            User admin = User.builder()
                    .email(adminEmail)
                    .username(adminUsername)
                    .password(passwordEncoder.encode(adminPassword))
                    .role("ADMIN")
                    .build();
            userRepository.save(admin);
            log.info("[Scaffy] Admin user seeded: {}", adminEmail);
        }
    }
}
