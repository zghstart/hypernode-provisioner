package com.hypernode.provisioner;

import com.hypernode.provisioner.consumer.RedisStreamConsumer;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * HyperNode-Provisioner Application
 * GPU 算力节点自动化配置与验证平台
 */
@SpringBootApplication
@EnableAsync
@RequiredArgsConstructor
public class HypernodeProvisionerApplication {

    private final RedisStreamConsumer redisStreamConsumer;

    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(HypernodeProvisionerApplication.class, args);

        // 启动 Redis Stream 消费者
        RedisStreamConsumer consumer = context.getBean(RedisStreamConsumer.class);
        consumer.startConsuming();

        System.out.println("========================================");
        System.out.println("HyperNode-Provisioner started successfully!");
        System.out.println("Server running on: http://localhost:8080");
        System.out.println("SSE Stream available at: http://localhost:8080/api/v1/stream/events");
        System.out.println("========================================");
    }
}
