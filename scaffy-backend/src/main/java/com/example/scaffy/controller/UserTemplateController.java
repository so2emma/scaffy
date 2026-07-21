package com.example.scaffy.controller;

import com.example.scaffy.model.User;
import com.example.scaffy.model.UserTemplate;
import com.example.scaffy.model.dto.SaveTemplateRequest;
import com.example.scaffy.repository.UserTemplateRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/user-templates")
@RequiredArgsConstructor
public class UserTemplateController {
    private final UserTemplateRepository templateRepository;

    private User getCurrentUser(Authentication auth) { return (User) auth.getPrincipal(); }

    // GET /api/user-templates  (own templates)
    @GetMapping
    public ResponseEntity<List<UserTemplate>> getMyTemplates(Authentication auth) {
        return ResponseEntity.ok(
                templateRepository.findByUserIdOrderByCreatedAtDesc(getCurrentUser(auth).getId()));
    }

    // GET /api/user-templates/community  (public, no auth required)
    @GetMapping("/community")
    public ResponseEntity<List<UserTemplate>> getCommunityTemplates() {
        return ResponseEntity.ok(templateRepository.findByIsPublicTrueOrderByCreatedAtDesc());
    }

    // POST /api/user-templates
    @PostMapping
    public ResponseEntity<UserTemplate> createTemplate(
            @Valid @RequestBody SaveTemplateRequest req, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        UserTemplate template = UserTemplate.builder()
                .userId(userId)
                .name(req.getName())
                .description(req.getDescription())
                .category(req.getCategory())
                .icon(req.getIcon() != null ? req.getIcon() : "Package")
                .diagramJson(req.getDiagramJson())
                .entityCount(req.getEntityCount() != null ? req.getEntityCount() : 0)
                .isPublic(req.getIsPublic() != null && req.getIsPublic())
                .build();
        return ResponseEntity.ok(templateRepository.save(template));
    }

    // PUT /api/user-templates/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTemplate(@PathVariable UUID id,
            @RequestBody SaveTemplateRequest req, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        return templateRepository.findByIdAndUserId(id, userId)
                .map(t -> {
                    if (req.getName() != null) t.setName(req.getName());
                    if (req.getDescription() != null) t.setDescription(req.getDescription());
                    if (req.getCategory() != null) t.setCategory(req.getCategory());
                    if (req.getDiagramJson() != null) t.setDiagramJson(req.getDiagramJson());
                    if (req.getIsPublic() != null) t.setIsPublic(req.getIsPublic());
                    if (req.getEntityCount() != null) t.setEntityCount(req.getEntityCount());
                    return ResponseEntity.ok(templateRepository.save(t));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/user-templates/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable UUID id, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        return templateRepository.findByIdAndUserId(id, userId)
                .map(t -> { templateRepository.delete(t); return ResponseEntity.noContent().build(); })
                .orElse(ResponseEntity.notFound().build());
    }
}
