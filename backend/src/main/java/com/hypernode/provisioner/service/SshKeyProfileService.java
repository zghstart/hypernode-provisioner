package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.SshKeyProfile;
import com.hypernode.provisioner.repository.SshKeyProfileRepository;
import com.hypernode.provisioner.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SshKeyProfileService {

    private final SshKeyProfileRepository repository;
    private final ServerRepository serverRepository;
    private final PasswordEncodingService passwordEncodingService;

    public List<SshKeyProfile> getAll() {
        return repository.findAll().stream().map(this::stripKey).toList();
    }

    public Optional<SshKeyProfile> getById(String id) {
        return repository.findById(id).map(this::stripKey);
    }

    public SshKeyProfile create(SshKeyProfile profile, String rawPrivateKey) {
        if (rawPrivateKey == null || rawPrivateKey.isBlank()) {
            throw new IllegalArgumentException("SSH private key is required");
        }
        String trimmed = rawPrivateKey.trim();
        if (!trimmed.contains("-----BEGIN") || !trimmed.contains("PRIVATE KEY-----")) {
            throw new IllegalArgumentException("Invalid SSH private key format");
        }

        profile.setId(null);
        profile.setPrivateKeyEncrypted(passwordEncodingService.encryptPrivateKey(trimmed));
        profile.setFingerprint(computeFingerprint(trimmed));
        profile.setUpdatedAt(LocalDateTime.now());

        SshKeyProfile saved = repository.save(profile);
        return stripKey(saved);
    }

    public SshKeyProfile update(String id, SshKeyProfile incoming, String rawPrivateKey) {
        SshKeyProfile existing = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("SSH Key Profile not found: " + id));

        existing.setName(incoming.getName());
        existing.setUsername(incoming.getUsername());
        existing.setDescription(incoming.getDescription());

        if (rawPrivateKey != null && !rawPrivateKey.isBlank()) {
            String trimmed = rawPrivateKey.trim();
            existing.setPrivateKeyEncrypted(passwordEncodingService.encryptPrivateKey(trimmed));
            existing.setFingerprint(computeFingerprint(trimmed));
        }

        existing.setUpdatedAt(LocalDateTime.now());
        return stripKey(repository.save(existing));
    }

    public void delete(String id) {
        long serverCount = serverRepository.countBySshKeyProfileId(id);
        if (serverCount > 0) {
            throw new IllegalStateException("Cannot delete: " + serverCount + " servers are using this key profile");
        }
        repository.deleteById(id);
    }

    public String getDecryptedKey(String profileId) {
        SshKeyProfile profile = repository.findById(profileId)
            .orElseThrow(() -> new RuntimeException("SSH Key Profile not found: " + profileId));
        return passwordEncodingService.decryptPrivateKey(profile.getPrivateKeyEncrypted());
    }

    public String getUsernameForProfile(String profileId) {
        return repository.findById(profileId).map(SshKeyProfile::getUsername).orElse(null);
    }

    public long countServersUsing(String profileId) {
        return serverRepository.countBySshKeyProfileId(profileId);
    }

    private String computeFingerprint(String privateKey) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(privateKey.getBytes());
            return "SHA256:" + HexFormat.of().formatHex(digest).substring(0, 32);
        } catch (Exception e) {
            return "unknown";
        }
    }

    private SshKeyProfile stripKey(SshKeyProfile p) {
        return SshKeyProfile.builder()
            .id(p.getId())
            .name(p.getName())
            .username(p.getUsername())
            .fingerprint(p.getFingerprint())
            .description(p.getDescription())
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt())
            .build();
    }
}
