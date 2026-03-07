#!/usr/bin/env bash
# gradlew - Gradle Wrapper Script

GRADLE_VERSION=8.5
GRADLE_ZIP="gradle-${GRADLE_VERSION}-bin.zip"
GRADLE_URL="https://services.gradle.org/distributions/${GRADLE_ZIP}"
GRADLE_HOME="/tmp/gradle-${GRADLE_VERSION}"

# Download Gradle if not exists
if [ ! -d "$GRADLE_HOME" ]; then
    echo "Downloading Gradle $GRADLE_VERSION..."
    curl -L "$GRADLE_URL" -o "/tmp/${GRADLE_ZIP}"
    unzip -q "/tmp/${GRADLE_ZIP}" -d /tmp
    rm "/tmp/${GRADLE_ZIP}"
fi

# Run Gradle
"$GRADLE_HOME/bin/gradle" "$@"