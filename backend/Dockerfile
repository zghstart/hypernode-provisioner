# Build stage
FROM gradle:8.5-jdk21 AS builder
WORKDIR /build

# Copy gradle files for dependency caching
COPY build.gradle settings.gradle ./
COPY gradle/wrapper/gradle-wrapper.jar gradle/wrapper/
COPY --chown=gradle:gradle gradle/ gradle/

# Cache dependencies
RUN gradle dependencies --no-daemon || true

# Copy source code
COPY src/ src/

# Build the application
RUN gradle clean build -x test --no-daemon

# Runtime stage
FROM openjdk:21-slim

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copy built artifacts
COPY --from=builder /build/build/libs/*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Switch to non-root user
USER appuser

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
