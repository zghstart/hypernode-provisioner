package com.hypernode.provisioner.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.RedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Redis Stream Service Test
 */
@ExtendWith(MockitoExtension.class)
class RedisStreamServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private RedisStreamService redisStreamService;

    @Test
    void shouldSendEventToStream() {
        // Given
        Map<String, Object> data = Map.of("key", "value");

        // When
        String resultId = redisStreamService.sendEvent("task-123", "test_event", data);

        // Then
        assertThat(resultId).isNotBlank();
        verify(redisTemplate, times(1)).opsForStream();
    }

    @Test
    void shouldSendProgress() {
        // When
        redisStreamService.sendProgress("task-123", 3, 7);

        // Then
        verify(redisTemplate, times(1)).opsForStream();
    }

    @Test
    void shouldReadTaskProgress() {
        // Given
        MapRecord<String, Object, Object> record = mock(MapRecord.class);
        when(record.getValue()).thenReturn(new HashMap<>());

        List<MapRecord<String, Object, Object>> records = List.of(record);
        when(redisTemplate.opsForStream().read(any(), any()))
            .thenReturn(records);

        // When
        var result = redisStreamService.readTaskProgress("task-123", "0-0");

        // Then
        assertThat(result).hasSize(1);
    }
}
