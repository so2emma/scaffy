package com.example.scaffy.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        return ResponseEntity.internalServerError().body(Map.of(
                "error", "Internal Server Error",
                "message", ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred"
        ));
    }
}
