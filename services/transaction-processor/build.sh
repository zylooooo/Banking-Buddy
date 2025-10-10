#!/bin/bash
echo "Building Lambda deployment package using Docker..."

cd "$(dirname "$0")"

docker build -f Dockerfile.build -t lambda-builder .
docker create --name lambda-temp lambda-builder
docker cp lambda-temp:/build/lambda-deployment-package.zip ../../infrastructure/terraform/services/transaction-processor/
docker rm lambda-temp

echo "Build complete! Package created at infrastructure/terraform/services/transaction-processor/lambda-deployment-package.zip"