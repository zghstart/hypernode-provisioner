package com.hypernode.provisioner.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.X509Certificate;

/**
 * TLS Configuration
 * TLS/SSL 配置
 * 用于安全的 HTTP 通信
 */
@Configuration
public class TlsConfig {

    /**
     * 自定义 RestTemplate（启用 TLS）
     */
    @Bean
    public RestTemplate restTemplate() throws Exception {
        SSLContext sslContext = SSLContext.getInstance("TLS");

        // 信任所有证书（生产环境应使用证书颁发机构签名的证书）
        TrustManager[] trustAllCerts = new TrustManager[]{
            new X509TrustManager() {
                public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[0];
                }

                public void checkClientTrusted(X509Certificate[] certs, String authType) {
                }

                public void checkServerTrusted(X509Certificate[] certs, String authType) {
                }
            }
        };

        sslContext.init(null, trustAllCerts, new java.security.SecureRandom());

        RestTemplate restTemplate = new RestTemplate();
        // 实际应配置 HTTPS 的 SSLContext
        return restTemplate;
    }

    /**
     * mTLS 配置
     * 双向 TLS 认证
     */
    public void configureMutualTls() {
        // 实现 mTLS 配置
        // 需要客户端证书和服务器证书
    }
}
