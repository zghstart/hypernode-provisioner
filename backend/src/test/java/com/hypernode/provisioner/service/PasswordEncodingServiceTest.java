package com.hypernode.provisioner.service;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Password Encoding Service Test
 */
class PasswordEncodingServiceTest {

    @Test
    void shouldEncodeAndMatchPassword() {
        // Given
        PasswordEncodingService service = new PasswordEncodingService();
        String rawPassword = "secret123";

        // When
        String encoded = service.encodePassword(rawPassword);

        // Then
        assertThat(encoded).isNotBlank();
        assertThat(encoded).startsWith("$2a$");
        assertThat(service.matchesPassword(rawPassword, encoded)).isTrue();
        assertThat(service.matchesPassword("wrong", encoded)).isFalse();
    }

    @Test
    void shouldEncodePrivateKey() {
        // Given
        PasswordEncodingService service = new PasswordEncodingService();
        String privateKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEA...";

        // When
        String encrypted = service.encryptPrivateKey(privateKey);

        // Then
        assertThat(encrypted).isNotBlank();
    }

    @Test
    void shouldDecodePrivateKey() {
        // Given
        PasswordEncodingService service = new PasswordEncodingService();
        String privateKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEA...";
        String encrypted = service.encryptPrivateKey(privateKey);

        // When
        String decrypted = service.decryptPrivateKey(encrypted);

        // Then
        assertThat(decrypted).isEqualTo(privateKey);
    }
}
