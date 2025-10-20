#!/bin/bash
# Build script for audit-reader Lambda deployment package

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building audit-reader Lambda deployment package..."

# Create temporary directory for package
rm -rf package
mkdir -p package

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt -t package/ --quiet

# Copy Lambda function code
echo "Copying Lambda function..."
cp lambda_function.py package/

# Create deployment zip
echo "Creating deployment package..."
cd package
zip -r ../audit-reader.zip . -q
cd ..

# Clean up
rm -rf package

echo "✓ Deployment package created: audit-reader.zip"
echo "Size: $(du -h audit-reader.zip | cut -f1)"
