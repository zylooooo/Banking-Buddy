# Banking Buddy Load Testing Suite

Simple k6 load testing setup for Banking Buddy application with 100 concurrent user support.

## Setup

1. **Install k6**:

   ```bash
   # macOS
   brew install k6

   # Or download from https://k6.io/docs/getting-started/installation/
   ```

2. **Install dependencies**: `npm install`

## Available Tests

### 1. Baseline Test

Single user performance testing to establish performance baselines.

```bash
# Run baseline test with JSON output for report generation
k6 run --out json=baseline-test-results.json tests/baseline-test.js --env ENVIRONMENT=dev

# Or run without JSON output (console only)
k6 run tests/baseline-test.js --env ENVIRONMENT=dev
```

### 2. Load Test

100 concurrent user load testing for scalability validation.

```bash
# Run load test with JSON output for report generation
k6 run --out json=load-test-results.json tests/full-system-load-test.js --env ENVIRONMENT=dev

# Or run without JSON output (console only)
k6 run tests/full-system-load-test.js --env ENVIRONMENT=dev
```

## Configuration

### Environment Setup

Update the URLs in `config.js`:

```javascript
environments: {
  dev: {
    baseUrl: 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev',
    frontendUrl: 'https://your-cloudfront-domain.cloudfront.net',
    // ... other configurations
  }
}
```

### Getting Your AWS URLs

1. **Frontend URL**: From your CloudFront distribution
2. **API Gateway URL**: From AWS Console > API Gateway > Your API > Stages
3. **Service URLs**: From your Terraform outputs or AWS Console

## Generate Reports

**Important**: You must run tests with `--out json=filename.json` to generate reports.

After running tests with JSON output, generate HTML reports:

```bash
# For baseline test
node generate-pdf-report.js baseline-test-results.json baseline baseline-report.html

# For load test
node generate-pdf-report.js load-test-results.json load load-test-report.html
```

**Complete Example Workflow:**

```bash
# 1. Run baseline test with JSON output
k6 run --out json=baseline-test-results.json tests/baseline-test.js --env ENVIRONMENT=dev

# 2. Generate baseline report
node generate-pdf-report.js baseline-test-results.json baseline baseline-report.html

# 3. Run load test with JSON output
k6 run --out json=load-test-results.json tests/full-system-load-test.js --env ENVIRONMENT=dev

# 4. Generate load test report
node generate-pdf-report.js load-test-results.json load load-test-report.html
```

## Test Users

- 100 pre-configured test agents: `loadtest.agent001-100@bankingbuddy.test`
- Password: `LoadTest123!`
- All accounts active and ready for testing

## Key Performance Targets

- HTTP Response P95: < 5 seconds
- Business Workflow P95: < 15 seconds
- Error Rate: < 5%
- Workflow Success: > 90%

## Files Structure

```
load-tests/
├── tests/
│   ├── baseline-test.js          # Single user baseline test
│   └── full-system-load-test.js  # 100 user load test
├── utils/
│   └── auth.js                   # Authentication utilities
├── config.js                     # Test configuration
├── generate-pdf-report.js        # Report generator
├── package.json                  # Dependencies
├── baseline-report.html          # Generated baseline report
└── load-test-report.html         # Generated load test report
```

- 100 Virtual Users → 20 Real Users
- Each real user handles up to 5 concurrent sessions
- VU #1, #21, #41, #61, #81 → use Agent01
- VU #2, #22, #42, #62, #82 → use Agent02
- And so on...

## Monitoring During Tests

While running tests, monitor:

1. **AWS CloudWatch**:

   - ALB metrics
   - ECS/Fargate CPU/Memory
   - RDS performance
   - ElastiCache hit rates

2. **Application Logs**:

   - Error rates in application logs
   - Database query performance
   - Cache performance

3. **k6 Real-time Output**:
   - Request rates
   - Response times
   - Error percentages

## Troubleshooting

### Common Issues

1. **High Error Rates**:

   - Check if services are properly deployed
   - Verify authentication configuration
   - Check AWS service limits

2. **Slow Response Times**:

   - Monitor database performance
   - Check network latency
   - Verify auto-scaling configuration

3. **Connection Errors**:
   - Verify URLs in config.js
   - Check security group settings
   - Confirm services are running

### Debug Mode

```bash
# Run with verbose output
k6 run tests/full-system-load-test.js --http-debug

# Run with smaller load for debugging
k6 run tests/full-system-load-test.js --vus 5 --duration 2m
```

## Best Practices

1. **Start Small**: Begin with 10-20 VUs before scaling to 100
2. **Monitor Resources**: Watch AWS costs and resource utilization
3. **Test Incrementally**: Test individual services before full system tests
4. **Use Staging Environment**: Avoid production for load testing
5. **Schedule Tests**: Run during off-peak hours if testing production-like environments

## Results Analysis

After testing, analyze:

1. Performance bottlenecks
2. Scaling requirements
3. Database optimization needs
4. Caching improvements
5. Infrastructure sizing

The load test results will help you optimize your Banking Buddy application for production workloads.
