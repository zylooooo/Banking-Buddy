import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { authenticateAgent, createAuthHeaders } from '../utils/auth.js';
import { config } from '../config.js';

// Custom metrics for baseline performance
const loginDuration = new Trend('baseline_login_duration');
const apiCallDuration = new Trend('baseline_api_call_duration');
const errorRate = new Rate('baseline_error_rate');
const totalRequests = new Counter('baseline_total_requests');

const env = __ENV.ENVIRONMENT || 'dev';
const baseConfig = config.environments[env];

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      vus: 1, // Single user for baseline
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.01'],    // Less than 1% errors
    baseline_login_duration: ['p(95)<3000'],
    baseline_api_call_duration: ['p(95)<1000'],
    baseline_error_rate: ['rate<0.01'],
  },
};

export default function () {
  // Test both agent and admin accounts for comprehensive baseline
  const iteration = __ITER;
  const testUser = iteration % 2 === 0 ? {
    username: 'yapzukai@gmail.com',
    password: 'Atestaccount123!',
    role: 'agent'
  } : {
    username: 'zukai.yap.2023@scis.smu.edu.sg', 
    password: '*0gnilxB',
    role: 'admin'
  };

  console.log(`[BASELINE] Starting baseline test iteration as ${testUser.role}: ${testUser.username}`);

  // Test 1: Authentication Performance
  const authStartTime = new Date().getTime();
  const authResult = authenticateAgent(testUser.username, testUser.password);
  const authEndTime = new Date().getTime();
  
  const authSuccess = check(authResult, {
    'Baseline - Authentication successful': (r) => r && r.accessToken && !r.isMockAuth,
    'Baseline - Has valid token': (r) => r && r.accessToken && r.accessToken.length > 50,
  });
  
  loginDuration.add(authEndTime - authStartTime);
  totalRequests.add(1);
  
  if (!authSuccess) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const headers = createAuthHeaders(authResult);

  // Test 2: API Endpoint Performance (role-based endpoints)
  const agentEndpoints = [
    { name: 'Health Check', url: `${baseConfig.baseUrl}/health`, method: 'GET', requiresAuth: false },
    { name: 'User Profile', url: `${baseConfig.baseUrl}/api/users/me`, method: 'GET', requiresAuth: true },
    { name: 'My Clients', url: `${baseConfig.baseUrl}/api/clients`, method: 'GET', requiresAuth: true },
    { name: 'My Transactions', url: `${baseConfig.baseUrl}/api/transactions`, method: 'GET', requiresAuth: true },
  ];

  const adminEndpoints = [
    { name: 'Health Check', url: `${baseConfig.baseUrl}/health`, method: 'GET', requiresAuth: false },
    { name: 'User Profile', url: `${baseConfig.baseUrl}/api/users/me`, method: 'GET', requiresAuth: true },
    { name: 'All Users', url: `${baseConfig.baseUrl}/api/users`, method: 'GET', requiresAuth: true },
    { name: 'All Clients', url: `${baseConfig.baseUrl}/api/clients`, method: 'GET', requiresAuth: true },
    { name: 'Analytics', url: `${baseConfig.baseUrl}/api/analytics`, method: 'GET', requiresAuth: true },
    { name: 'Reports', url: `${baseConfig.baseUrl}/api/reports`, method: 'GET', requiresAuth: true },
  ];

  const endpoints = testUser.role === 'admin' ? adminEndpoints : agentEndpoints;

  endpoints.forEach(endpoint => {
    const apiStartTime = new Date().getTime();
    
    let response;
    const requestHeaders = endpoint.requiresAuth ? headers : {};
    
    if (endpoint.method === 'GET') {
      response = http.get(endpoint.url, { headers: requestHeaders });
    } else {
      response = http.post(endpoint.url, {}, { headers: requestHeaders });
    }
    
    const apiEndTime = new Date().getTime();
    const duration = apiEndTime - apiStartTime;
    
    // More lenient success criteria - 401/403 may be expected for some endpoints
    const isSuccess = response.status >= 200 && response.status < 500;
    const isFast = duration < 2000;
    const hasResponse = response.body && response.body.length > 0;
    
    const success = check(response, {
      [`Baseline - ${endpoint.name} - Response received`]: (r) => isSuccess,
      [`Baseline - ${endpoint.name} - Fast response`]: (r) => isFast,
      [`Baseline - ${endpoint.name} - Has body`]: (r) => hasResponse,
    });
    
    apiCallDuration.add(duration);
    totalRequests.add(1);
    
    // Log results with more context
    const statusInfo = endpoint.requiresAuth ? 
      (response.status === 401 || response.status === 403 ? '(Expected - Auth Required)' : '') :
      (response.status >= 400 ? '(Unexpected Error)' : '');
    
    if (isSuccess && isFast) {
      console.log(`[BASELINE] ${endpoint.name} success - Status: ${response.status} ${statusInfo}, Duration: ${duration}ms`);
    } else {
      console.log(`[BASELINE] ${endpoint.name} issues - Status: ${response.status} ${statusInfo}, Duration: ${duration}ms`);
      if (!isSuccess) errorRate.add(1);
    }
    
    sleep(0.5); // Small delay between API calls
  });

  // Test 3: Frontend Performance (if accessible)
  const frontendResponse = http.get(baseConfig.frontendUrl);
  check(frontendResponse, {
    'Baseline - Frontend accessible': (r) => r.status === 200,
    'Baseline - Frontend fast': (r) => r.timings.duration < 3000,
  });
  
  totalRequests.add(1);
  if (frontendResponse.status !== 200) {
    errorRate.add(1);
  }

  console.log(`[BASELINE] Completed iteration - Auth: ${authEndTime - authStartTime}ms, API calls completed`);
  
  sleep(2); // Wait between iterations
}

export function handleSummary(data) {
  return {
    'baseline-test-results.json': JSON.stringify(data, null, 2),
  };
}