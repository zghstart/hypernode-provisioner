#!/bin/bash
# Health check script for Spring Boot application

HEALTH_ENDPOINT="http://localhost:8080/actuator/health"
TIMEOUT=5

response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT --max-time $TIMEOUT "$HEALTH_ENDPOINT" 2>/dev/null)

if [ "$response" == "200" ]; then
    echo "Health check passed: HTTP $response"
    exit 0
else
    echo "Health check failed: HTTP $response"
    exit 1
fi
