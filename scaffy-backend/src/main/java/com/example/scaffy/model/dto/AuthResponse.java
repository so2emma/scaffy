package com.example.scaffy.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private UUID id;
    private String email;
    private String username;
    private String role;
}
