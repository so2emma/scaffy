package com.example.scaffy.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VersionSummaryDto {
    private UUID id;
    private Integer versionNumber;
    private String note;
    private OffsetDateTime createdAt;
}
