package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.entity.SshKeyProfile;
import com.hypernode.provisioner.service.SshKeyProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ssh-keys")
@RequiredArgsConstructor
public class SshKeyProfileController {

    private final SshKeyProfileService service;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<Map<String, Object>> result = service.getAll().stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("name", p.getName());
            m.put("username", p.getUsername());
            m.put("fingerprint", p.getFingerprint());
            m.put("description", p.getDescription());
            m.put("createdAt", p.getCreatedAt());
            m.put("updatedAt", p.getUpdatedAt());
            m.put("serverCount", service.countServersUsing(p.getId()));
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SshKeyProfile> getById(@PathVariable String id) {
        return service.getById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> payload) {
        try {
            SshKeyProfile profile = SshKeyProfile.builder()
                .name(payload.get("name"))
                .username(payload.get("username"))
                .description(payload.get("description"))
                .build();
            String privateKey = payload.get("privateKey");
            SshKeyProfile created = service.create(profile, privateKey);
            return ResponseEntity.created(URI.create("/api/v1/ssh-keys/" + created.getId())).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, String> payload) {
        try {
            SshKeyProfile incoming = SshKeyProfile.builder()
                .name(payload.get("name"))
                .username(payload.get("username"))
                .description(payload.get("description"))
                .build();
            SshKeyProfile updated = service.update(id, incoming, payload.get("privateKey"));
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
