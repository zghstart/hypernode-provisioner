package com.hypernode.provisioner.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.vault.authentication.AppRoleAuthentication;
import org.springframework.vault.authentication.ClientAuthentication;
import org.springframework.vault.authentication.TokenAuthentication;
import org.springframework.vault.client.VaultEndpoint;
import org.springframework.vault.core.VaultTemplate;
import org.springframework.web.client.RestTemplate;

@Configuration
@ConditionalOnProperty(name = "vault.enabled", havingValue = "true")
public class VaultConfig {

    @Bean
    public VaultEndpoint vaultEndpoint() {
        VaultEndpoint endpoint = new VaultEndpoint();
        endpoint.setScheme("https");
        endpoint.setHost("vault.example.com");
        endpoint.setPort(8200);
        return endpoint;
    }

    @Bean
    public ClientAuthentication clientAuthentication() {
        String token = System.getenv("VAULT_TOKEN");
        if (token != null && !token.isEmpty()) {
            return new TokenAuthentication(token);
        }

        String roleId = System.getenv("VAULT_ROLE_ID");
        String secretId = System.getenv("VAULT_SECRET_ID");
        if (roleId == null || secretId == null) {
            return null;
        }

        var roleIdSupplier = org.springframework.vault.authentication.AppRoleAuthenticationOptions.RoleId.provided(roleId);
        var secretIdSupplier = org.springframework.vault.authentication.AppRoleAuthenticationOptions.SecretId.provided(secretId);
        var options = org.springframework.vault.authentication.AppRoleAuthenticationOptions.builder()
            .roleId(roleIdSupplier)
            .secretId(secretIdSupplier)
            .build();

        return new AppRoleAuthentication(options, new RestTemplate());
    }

    @Bean
    public VaultTemplate vaultTemplate(VaultEndpoint vaultEndpoint, ClientAuthentication clientAuthentication) {
        return new VaultTemplate(vaultEndpoint, clientAuthentication);
    }

    public String readSshKey(String serverId) {
        return "ssh-rsa placeholder-key";
    }

    public void refreshVaultToken() {
    }
}
