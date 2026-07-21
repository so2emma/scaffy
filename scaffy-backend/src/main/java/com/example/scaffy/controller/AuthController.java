package com.example.scaffy.controller;

import com.example.scaffy.model.User;
import com.example.scaffy.model.dto.AuthRequest;
import com.example.scaffy.model.dto.AuthResponse;
import com.example.scaffy.model.dto.RegisterRequest;
import com.example.scaffy.repository.UserRepository;
import com.example.scaffy.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req, HttpServletResponse response) {
        if (userRepository.existsByEmail(req.getEmail()))
            return ResponseEntity.badRequest().body(Map.of("error", "Email already in use"));
        if (userRepository.existsByUsername(req.getUsername()))
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));

        User user = User.builder()
                .email(req.getEmail())
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))
                .role("USER")
                .build();
        userRepository.save(user);

        setJwtCookie(response, jwtUtil.generateToken(user.getEmail()));
        return ResponseEntity.ok(new AuthResponse(user.getId(), user.getEmail(), user.getUsername(), user.getRole()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest req, HttpServletResponse response) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElse(null);
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword()))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));

        setJwtCookie(response, jwtUtil.generateToken(user.getEmail()));
        return ResponseEntity.ok(new AuthResponse(user.getId(), user.getEmail(), user.getUsername(), user.getRole()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(new AuthResponse(user.getId(), user.getEmail(), user.getUsername(), user.getRole()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("scaffy_token", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    private void setJwtCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("scaffy_token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int)(86400));  // 24 hours
        // cookie.setSecure(true);  // enable in production with HTTPS
        response.addCookie(cookie);
    }
}
