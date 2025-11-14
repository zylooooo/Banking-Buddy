export const config = {
  // Environment-specific configurations
  environments: {
    dev: {
      // Updated with your actual AWS deployment URLs
      baseUrl: 'https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev',
      frontendUrl: 'https://d2hvwymdbftfvr.cloudfront.net',
      
      // Cognito configuration (extracted from your network inspection)
      cognitoUserPoolId: 'ap-southeast-1_TTJptwGiE',
      cognitoClientId: '6q3smsmi1p4umu1sli8nl4iaj2',
      cognitoDomain: 'banking-buddy-dev-auth.auth.ap-southeast-1.amazoncognito.com',
      awsRegion: 'ap-southeast-1',
      
      // Service-specific endpoints
      userServiceUrl: 'https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev',
      clientServiceUrl: 'https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/clients',
      transactionServiceUrl: 'https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/transactions',
      aiServiceUrl: 'https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/ai',
      auditServiceUrl: 'https://xl7l6dtk1l.execute-api.ap-southeast-1.amazonaws.com/dev/api/audit'
    },
    staging: {
      baseUrl: 'https://your-staging-api-gateway-url.execute-api.us-east-1.amazonaws.com/staging',
      frontendUrl: 'https://your-staging-cloudfront-domain.cloudfront.net',
      // ... staging configs
    },
    production: {
      baseUrl: 'https://your-prod-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod',
      frontendUrl: 'https://your-prod-cloudfront-domain.cloudfront.net',
      // ... production configs (use with extreme caution!)
    }
  },
  
  // Test scenarios configuration for 100 concurrent agents
  scenarios: {
    // Scenario 1: Gradual ramp up to 100 concurrent agents
    agent_load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 20 },   // Ramp up to 20 agents
        { duration: '3m', target: 50 },   // Ramp up to 50 agents
        { duration: '3m', target: 100 },  // Ramp up to 100 agents
        { duration: '10m', target: 100 }, // Stay at 100 agents for 10 minutes
        { duration: '2m', target: 50 },   // Scale down to 50
        { duration: '2m', target: 0 },    // Complete scale down
      ],
    },
    
    // Scenario 2: Spike test - sudden burst to 100 agents
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 100 }, // Sudden spike to 100 agents
        { duration: '5m', target: 100 },  // Hold spike
        { duration: '30s', target: 10 },
        { duration: '1m', target: 0 },
      ],
    },
    
    // Scenario 3: Constant load with 100 agents
    constant_load_test: {
      executor: 'constant-vus',
      vus: 100,
      duration: '15m',
    }
  },
  
  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<3000'],    // 95% of requests under 3s
    http_req_failed: ['rate<0.05'],       // Error rate under 5%
    checks: ['rate>0.95'],                // 95% of checks pass
    http_req_receiving: ['p(95)<1000'],   // 95% of response receiving time under 1s
    http_req_waiting: ['p(95)<2000'],     // 95% of waiting time under 2s
  }
};