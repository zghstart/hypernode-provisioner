package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.service.RedisStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SSE Stream Controller
 * Server-Sent Events 控制器
 * 提供实时事件流，支持 Redis Streams 回退
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/stream")
@RequiredArgsConstructor
public class SseStreamController {

    private final RedisStreamService redisStreamService;

    // 存储活跃的 SSE 连接
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    /**
     * SSE 事件流接口
     * 支持通过 Redis Streams 恢复历史事件
     */
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(
            @RequestParam(value = "taskId", required = false) String taskId,
            @RequestParam(value = "lastEventId", required = false) String lastEventId) {

        log.info("New SSE subscriber connected. taskId: {}, lastEventId: {}", taskId, lastEventId);

        SseEmitter emitter = new SseEmitter(300_000L); // 5 分钟超时

        // 保存 emitter 以便后续推送
        if (taskId != null) {
            emitters.put(taskId + "_" + System.currentTimeMillis(), emitter);
        }

        // 发送连接建立事件
        try {
            emitter.send(SseEmitter.event()
                .name("connected")
                .data(Map.of("timestamp", System.currentTimeMillis())));
        } catch (IOException e) {
            log.error("Failed to send connected event", e);
            emitter.completeWithError(e);
            return emitter;
        }

        // 如果有 lastEventId，从 Redis Streams 恢复历史事件
        if (lastEventId != null && !lastEventId.isEmpty() && taskId != null) {
            restoreEventsFromRedis(taskId, lastEventId, emitter);
        }

        // 推送完成事件
        emitter.onCompletion(() -> {
            log.info("SSE connection completed. taskId: {}", taskId);
            emitters.values().removeIf(em -> em == emitter);
        });

        emitter.onTimeout(() -> {
            log.warn("SSE connection timed out. taskId: {}", taskId);
            emitters.values().removeIf(em -> em == emitter);
        });

        emitter.onError((e) -> {
            log.error("SSE connection error. taskId: {}", taskId, e);
            emitters.values().removeIf(em -> em == emitter);
        });

        return emitter;
    }

    /**
     * 从 Redis Streams 恢复历史事件
     */
    @SuppressWarnings("unchecked")
    private void restoreEventsFromRedis(String taskId, String lastEventId, SseEmitter emitter) {
        try {
            var records = redisStreamService.readTaskProgress(taskId, lastEventId);
            for (var record : records) {
                Object value = record.getValue();
                if (value instanceof Map) {
                    Object data = ((Map<String, Object>) value).get("data");
                    if (data instanceof String) {
                        emitter.send(SseEmitter.event()
                            .name("restored")
                            .data(data));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to restore events from Redis", e);
        }
    }

    /**
     * 推送事件到指定任务的 SSE 连接
     */
    public void pushEventToTask(String taskId, String eventType, String eventData) {
        String event = String.format("event: %s\ndata: %s\n\n", eventType, eventData);

        emitters.entrySet().stream()
            .filter(e -> e.getKey().contains(taskId))
            .forEach(entry -> {
                try {
                    entry.getValue().send(event);
                } catch (Exception e) {
                    log.error("Failed to send event to emitter", e);
                    entry.getValue().completeWithError(e);
                }
            });
    }

    /**
     * 推送进度事件
     */
    public void pushProgress(String taskId, int currentStep, int totalSteps) {
        String data = String.format(
            "{\"taskId\":\"%s\",\"currentStep\":%d,\"totalSteps\":%d,\"timestamp\":%d}",
            taskId, currentStep, totalSteps, System.currentTimeMillis()
        );
        pushEventToTask(taskId, "progress", data);
    }

    /**
     * 推送完成事件
     */
    public void pushCompleted(String taskId, Boolean success, String message) {
        String data = String.format(
            "{\"taskId\":\"%s\",\"success\":%b,\"message\":\"%s\",\"timestamp\":%d}",
            taskId, success, message, System.currentTimeMillis()
        );
        pushEventToTask(taskId, "completed", data);
    }
}
