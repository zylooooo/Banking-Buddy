FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Create tmp directory for file operations
RUN mkdir -p /tmp

# Set python path
ENV PYTHONPATH=/app/src:/app

# Create a simple runner script
RUN echo '#!/bin/bash\n\
echo "Waiting for MySQL to be ready..."\n\
while ! nc -z mysql-db 3306; do sleep 1; done\n\
echo "MySQL is ready!"\n\
\n\
echo "Waiting for SFTP server to be ready..."\n\
while ! nc -z sftp-server 22; do sleep 1; done\n\
echo "SFTP server is ready!"\n\
\n\
echo "Starting transaction processor..."\n\
python -c "\n\
import os\n\
import sys\n\
sys.path.append(\"src\")\n\
from lambda_function import lambda_handler\n\
from unittest.mock import Mock\n\
\n\
context = Mock()\n\
context.function_name = \"transaction-processor\"\n\
context.remaining_time_in_millis = lambda: 30000\n\
\n\
result = lambda_handler({}, context)\n\
print(\"Result:\", result)\n\
\n\
if result[\"statusCode\"] == 200:\n\
    print(\"✅ Successfully populated database with transactions!\")\n\
    exit(0)\n\
else:\n\
    print(\"❌ Failed to populate database\")\n\
    exit(1)\n\
"\n\
echo "Transaction processor completed successfully!"' > /app/run_processor.sh && \
    chmod +x /app/run_processor.sh

CMD ["/app/run_processor.sh"]