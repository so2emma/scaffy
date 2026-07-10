package com.example.scaffy.service;

import com.example.scaffy.model.DiagramDto;

public interface ReverseEngineeringService {
    DiagramDto parseDdl(String ddl);
    DiagramDto scanSpringBootProject(String projectPath);
}
