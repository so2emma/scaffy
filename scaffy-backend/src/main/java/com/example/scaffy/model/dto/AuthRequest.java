package com.example.scaffy.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AuthRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8)
    private String password;
}
