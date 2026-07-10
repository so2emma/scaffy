package com.example.scaffy.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValidationConfigDto {
    private boolean required;
    private Integer minSize;
    private Integer maxSize;
    private boolean email;
}
