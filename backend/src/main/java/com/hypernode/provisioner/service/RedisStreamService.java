package com.hypernode.provisioner.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ObjectRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Redis Stream Service
 * Redis Streams 消息通道服务
 * 用于任务进度追踪和事件广播
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisStreamService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String EVENT_STREAM_PREFIX = "ansible:events:";
    private static final String RESULT_STREAM_PREFIX = "ansible:results:";

    /**
     * 发送事件到 Stream
     */
    public String sendEvent(String taskId, String eventType, Map<String, Object> data) {
        try {
            String streamName = EVENT_STREAM_PREFIX + taskId;
            Map<String, Object> record = new HashMap<>();
            record.put("type", eventType);
            record.put("timestamp", System.currentTimeMillis());
            record.put("data", objectMapper.writeValueAsString(data));

            RecordId id = redisTemplate.opsForStream()
                .add(streamName, record);

            log.debug("Sent event to stream {}: {} - {}", streamName, id, eventType);
            return id.getValue();
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize event data", e);
            throw new RuntimeException("Failed to send event", e);
        }
    }

    /**
     * 发送进度事件
     */
    public void sendProgress(String taskId, int currentStep, int totalSteps) {
        Map<String, Object> data = Map.of(
            "currentStep", currentStep,
            "totalSteps", totalSteps,
            "timestamp", System.currentTimeMillis()
        );
        sendEvent(taskId, "progress", data);
    }

    /**
     * 发送完成事件
     */
    public void sendCompleted(String taskId, Boolean success, String message) {
        Map<String, Object> data = Map.of(
            "success", success,
            "message", message,
            "timestamp", System.currentTimeMillis()
        );
        sendEvent(taskId, "completed", data);
    }

    /**
     * 发送失败事件
     */
    public void sendFailed(String taskId, String error, Throwable throwable) {
        Map<String, Object> data = Map.of(
            "error", error,
            "stacktrace", throwable.toString(),
            "timestamp", System.currentTimeMillis()
        );
        sendEvent(taskId, "failed", data);
    }

    /**
     * 读取任务进度（支持恢复）
     */
    @SuppressWarnings("unchecked")
    public List<MapRecord<String, String, String>> readTaskProgress(String taskId, String lastEventId) {
        String streamName = EVENT_STREAM_PREFIX + taskId;

        // Spring Data Redis 3.2 使用 fromStart 表示从头读取
        return (List<MapRecord<String, String, String>>) (List<?>) redisTemplate.opsForStream()
            .read(MapRecord.class, org.springframework.data.redis.connection.stream.StreamOffset.fromStart(streamName));
    }

    /**
     * 读取任务历史记录
     */
    @SuppressWarnings("unchecked")
    public List<MapRecord<String, String, String>> readTaskHistory(String taskId, int limit) {
        String streamName = EVENT_STREAM_PREFIX + taskId;
        // Spring Data Redis 3.2 没有 fromEnd，使用 fromStart 并限制返回数量
        List<MapRecord<String, String, String>> allRecords = (List<MapRecord<String, String, String>>) (List<?>) redisTemplate.opsForStream()
            .read(MapRecord.class, org.springframework.data.redis.connection.stream.StreamOffset.fromStart(streamName));

        // 反转列表获取最新的记录
        java.util.Collections.reverse(allRecords);
        return allRecords.subList(0, Math.min(limit, allRecords.size()));
    }

    /**
     * 保存任务结果到持久化 Stream
     */
    public String saveTaskResult(String taskId, Map<String, Object> result) {
        try {
            String streamName = RESULT_STREAM_PREFIX + taskId;
            Map<String, Object> record = new HashMap<>();
            record.put("taskId", taskId);
            record.put("result", objectMapper.writeValueAsString(result));
            record.put("timestamp", System.currentTimeMillis());

            RecordId id = redisTemplate.opsForStream()
                .add(streamName, record);

            // 设置 Stream 过期时间（7 天）
            redisTemplate.expire(streamName, Duration.ofDays(7));

            return id.getValue();
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize task result", e);
            throw new RuntimeException("Failed to save task result", e);
        }
    }

    /**
     * 获取任务结果
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getTaskResult(String taskId) {
        String streamName = RESULT_STREAM_PREFIX + taskId;
        // Spring Data Redis 3.2 没有 fromEnd，使用 fromStart 并获取最后一条记录
        List<MapRecord<String, String, String>> records = (List<MapRecord<String, String, String>>) (List<?>) redisTemplate.opsForStream()
            .read(MapRecord.class, org.springframework.data.redis.connection.stream.StreamOffset.fromStart(streamName));

        if (!records.isEmpty()) {
            MapRecord<String, String, String> record = records.get(records.size() - 1);
            Object value = record.getValue();
            if (value instanceof Map) {
                return (Map<String, Object>) value;
            }
        }
        return null;
    }
}
