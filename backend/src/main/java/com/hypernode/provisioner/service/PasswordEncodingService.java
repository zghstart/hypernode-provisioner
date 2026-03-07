package com.hypernode.provisioner.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Password Encoding Service
 * 密码加密服务
 * 用于加密敏感数据
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordEncodingService {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * 加密密码
     */
    public String encodePassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }

    /**
     * 验证密码
     */
    public boolean matchesPassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }

    /**
     * 加密 SSH 私钥
     */
    public String encryptPrivateKey(String privateKey) {
        // 实际应使用 Vault 或 KMS 加密
        // 这里使用简单的 Base64 编码示例
        return java.util.Base64.getEncoder().encodeToString(privateKey.getBytes());
    }

    /**
     * 解密 SSH 私钥
     */
    public String decryptPrivateKey(String encryptedKey) {
        // 实际应使用 Vault 或 KMS 解密
        byte[] decoded = java.util.Base64.getDecoder().decode(encryptedKey);
        return new String(decoded);
    }

    /**
     * 生成密钥对
     */
    public String[] generateKeyPair() {
        // 实际应使用 ssh-keygen 命令生成
        // 这里返回示例
        return new String[]{"private_key_placeholder", "public_key_placeholder"};
    }
}
