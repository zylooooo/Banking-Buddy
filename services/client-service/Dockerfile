FROM eclipse-temurin:21-jdk-alpine AS builder

# Run update and install dependencies
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# First, install the audit-logging-client library into local Maven repo
# Copy the pre-built JAR and POM from the shared library
COPY shared/java/target/audit-logging-client-1.0.0.jar /root/.m2/repository/com/bankingbuddy/audit-logging-client/1.0.0/audit-logging-client-1.0.0.jar
COPY shared/java/pom.xml /root/.m2/repository/com/bankingbuddy/audit-logging-client/1.0.0/audit-logging-client-1.0.0.pom

# Now build client-service
# Copy Maven wrapper and pom.xml first 
COPY client-service/mvnw .
COPY client-service/.mvn .mvn
COPY client-service/pom.xml .

# Make mvnw executable
RUN chmod +x mvnw

# Download dependencies (will now find audit-logging-client in local Maven repo)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY client-service/src ./src

# Build the application
RUN ./mvnw clean package -DskipTests -B

# Production stage
FROM eclipse-temurin:21-jdk-alpine AS runtime

# Run update and install dependencies
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy the JAR file from builder stage
COPY --from=builder /app/target/client-service-*.jar app.jar

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# JVM optimization for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -Djava.security.egd=file:/dev/./urandom"

# Expose port 8081 (different from user-service)
EXPOSE 8081

# Start the application
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
