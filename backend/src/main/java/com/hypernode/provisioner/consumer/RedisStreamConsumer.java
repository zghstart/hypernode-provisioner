package com.hypernode.provisioner.consumer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;

/**
 * Redis Stream Consumer
 * Redis Streams 消费者
 * 处理任务事件和进度更新
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisStreamConsumer {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String EVENT_STREAM_PREFIX = "ansible:events:";
    private static final String RESULT_STREAM_PREFIX = "ansible:results:";
    private static final String CONSUMER_GROUP = "sse-subscribers";

    /**
     * 启动消费者组
     */
    public void startConsuming() {
        log.info("Starting Redis Stream consumer...");

        // 创建消费者组
        // Spring Data Redis 3.2 使用 MapRecord<String, String, String>
        StreamMessageListenerContainer<String, MapRecord<String, String, String>> container =
            StreamMessageListenerContainer.create(redisTemplate.getConnectionFactory());

        // 监听所有任务事件
        StreamOffset<String> streamOffset = StreamOffset.fromStart(EVENT_STREAM_PREFIX + "*");

        container.receive(streamOffset, createStreamListener());

        container.start();
        log.info("Redis Stream consumer started successfully");
    }

    /**
     * 创建流监听器
     */
    private StreamListener<String, MapRecord<String, String, String>> createStreamListener() {
        return new StreamListener<String, MapRecord<String, String, String>>() {
            @Override
            public void onMessage(MapRecord<String, String, String> message) {
                try {
                    String streamName = message.getStream();
                    String taskId = extractTaskId(streamName);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> recordValue = (Map<String, Object>) (Map<?, ?>) message.getValue();

                    String eventType = (String) recordValue.get("type");
                    String dataJson = (String) recordValue.get("data");

                    log.debug("Received event: {} from stream: {}", eventType, streamName);

                    // 处理不同类型的消息
                    switch (eventType) {
                        case "progress" -> handleProgress(taskId, dataJson);
                        case "completed" -> handleCompleted(taskId, dataJson);
                        case "failed" -> handleFailed(taskId, dataJson);
                        default -> log.warn("Unknown event type: {}", eventType);
                    }

                    // 确认消息
                    redisTemplate.opsForStream()
                        .acknowledge(EVENT_STREAM_PREFIX + taskId, CONSUMER_GROUP, message.getId());

                } catch (Exception e) {
                    log.error("Error processing stream message", e);
                }
            }
        };
    }

    /**
     * 从 stream 名称中提取 task ID
     */
    private String extractTaskId(String streamName) {
        return streamName.replace(EVENT_STREAM_PREFIX, "");
    }

    /**
     * 处理进度事件
     */
    private void handleProgress(String taskId, String dataJson) {
        try {
            Map<String, Object> data = objectMapper.readValue(dataJson, Map.class);
            log.info("Task {} progress: {}/{}", taskId,
                data.get("currentStep"), data.get("totalSteps"));
        } catch (JsonProcessingException e) {
            log.error("Failed to parse progress data", e);
        }
    }

    /**
     * 处理完成事件
     */
    private void handleCompleted(String taskId, String dataJson) {
        try {
            Map<String, Object> data = objectMapper.readValue(dataJson, Map.class);
            Boolean success = (Boolean) data.get("success");
            log.info("Task {} completed: success={}", taskId, success);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse completed data", e);
        }
    }

    /**
     * 处理失败事件
     */
    private void handleFailed(String taskId, String dataJson) {
        try {
            Map<String, Object> data = objectMapper.readValue(dataJson, Map.class);
            String error = (String) data.get("error");
            log.error("Task {} failed: {}", taskId, error);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse failed data", e);
        }
    }
}
