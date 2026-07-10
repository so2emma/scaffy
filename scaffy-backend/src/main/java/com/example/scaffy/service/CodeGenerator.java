package com.example.scaffy.service;

import com.example.scaffy.model.DiagramDto;
import java.util.Map;

public interface CodeGenerator {
    boolean supports(String framework);
    byte[] generateZip(DiagramDto diagram) throws Exception;
    Map<String, String> generatePreview(DiagramDto diagram, String entityName) throws Exception;
}
