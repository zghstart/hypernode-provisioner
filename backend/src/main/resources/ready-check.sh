#!/bin/bash
# Readiness check script for Spring Boot application

READY_ENDPOINT="http://localhost:8080/actuator/health"
MAX_RETRIES=30
RETRY_INTERVAL=2
retry=0

while [ $retry -lt $MAX_RETRIES ]; do
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 5 "$READY_ENDPOINT" 2>/dev/null)
    
    if [ "$response" == "200" ]; then
        echo "Application is ready: HTTP $response"
        exit 0
    fi
    
    retry=$((retry + 1))
    echo "Waiting for application to be ready... (attempt $retry/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
done

echo "Application failed to become ready after $MAX_RETRIES attempts"
exit 1
