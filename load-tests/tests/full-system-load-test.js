import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config } from '../config.js';
import { getSequentialAgent, createAuthHeaders } from '../utils/auth.js';

const env = __ENV.ENVIRONMENT || 'dev';
const baseConfig = config.environments[env];

// Custom metrics for end-to-end scenarios
const endToEndTime = new Trend('end_to_end_response_time');
const businessWorkflowTime = new Trend('business_workflow_time');
const systemErrors = new Rate('system_errors');
const workflowSuccess = new Rate('workflow_success');
const userJourneyTime = new Trend('user_journey_time');
const dataConsistencyErrors = new Rate('data_consistency_errors');

export const options = {
  scenarios: {
    // Full system load test with 100 concurrent agents
    full_system_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 25 },   // Warm up to 25 agents
        { duration: '3m', target: 50 },   // Ramp to 50 agents
        { duration: '2m', target: 100 },  // Ramp to 100 agents
        { duration: '15m', target: 100 }, // Sustain 100 concurrent agents
        { duration: '3m', target: 50 },   // Scale down to 50
        { duration: '2m', target: 0 },    // Complete scale down
      ],
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],        // 95% of requests under 5s
    http_req_failed: ['rate<0.05'],           // Error rate under 5%
    end_to_end_response_time: ['p(95)<8000'], // End-to-end under 8s
    business_workflow_time: ['p(95)<15000'],  // Full workflow under 15s
    system_errors: ['rate<0.03'],             // System error rate under 3%
    workflow_success: ['rate>0.90'],          // 90% of workflows succeed
    user_journey_time: ['p(95)<20000'],       // Complete user journey under 20s
    data_consistency_errors: ['rate<0.01'],   // Data consistency errors under 1%
  }
};

export function setup() {
  console.log('Starting full system load test with 100 concurrent agents');
  console.log(`Frontend: ${baseConfig.frontendUrl}`);
  console.log(`API: ${baseConfig.baseUrl}`);
  
  // System health check across all services
  const services = [
    { name: 'Frontend', url: baseConfig.frontendUrl },
    { name: 'User Service', url: `${baseConfig.userServiceUrl}/actuator/health` },
    { name: 'AI Service', url: `${baseConfig.aiServiceUrl}/actuator/health` }
  ];
  
  services.forEach(service => {
    try {
      const response = http.get(service.url);
      console.log(`${service.name} health: ${response.status}`);
    } catch (error) {
      console.log(`${service.name} health check failed: ${error.message}`);
    }
  });
  
  return {
    frontendUrl: baseConfig.frontendUrl,
    baseUrl: baseConfig.baseUrl,
    userServiceUrl: baseConfig.userServiceUrl,
    clientServiceUrl: baseConfig.clientServiceUrl,
    transactionServiceUrl: baseConfig.transactionServiceUrl,
    aiServiceUrl: baseConfig.aiServiceUrl,
    auditServiceUrl: baseConfig.auditServiceUrl
  };
}

export default function(data) {
  // Use sequential agent assignment to ensure even distribution
  const agent = getSequentialAgent(__VU);
  
  // Execute complete business workflow
  executeAgentWorkflow(agent, data);
  
  // Random think time between workflows (2-8 seconds)
  sleep(Math.random() * 6 + 2);
}

function executeAgentWorkflow(agent, data) {
  const workflowStart = Date.now();
  const userJourneyStart = Date.now();
  let workflowSuccessful = true;
  let stepCount = 0;
  
  console.log(`Agent ${agent.agentId} (VU ${__VU}): Starting complete workflow`);
  
  const headers = createAuthHeaders(agent);
  
  try {
    // Step 1: Agent accesses frontend and loads dashboard
    stepCount++;
    const dashboardResult = loadDashboardWorkflow(data.frontendUrl, data.baseUrl, headers, agent);
    if (!dashboardResult.success) workflowSuccessful = false;
    
    sleep(1);
    
    // Step 2: Agent views and manages clients
    stepCount++;
    const clientResult = manageClientsWorkflow(data.clientServiceUrl, headers, agent);
    if (!clientResult.success) workflowSuccessful = false;
    
    sleep(1);
    
    // Step 3: Agent reviews transactions
    stepCount++;
    const transactionResult = reviewTransactionsWorkflow(data.transactionServiceUrl, headers, agent);
    if (!transactionResult.success) workflowSuccessful = false;
    
    sleep(1);
    
    // Step 4: Agent uses AI features
    stepCount++;
    const aiResult = useAIFeaturesWorkflow(data.aiServiceUrl, headers, agent);
    if (!aiResult.success) workflowSuccessful = false;
    
    sleep(1);
    
    // Step 5: Agent checks audit logs
    stepCount++;
    const auditResult = checkAuditLogsWorkflow(data.auditServiceUrl, headers, agent);
    if (!auditResult.success) workflowSuccessful = false;
    
  } catch (error) {
    console.error(`Agent ${agent.agentId} workflow failed at step ${stepCount}: ${error.message}`);
    workflowSuccessful = false;
    systemErrors.add(1);
  }
  
  const workflowTime = Date.now() - workflowStart;
  const userJourneyTime_ms = Date.now() - userJourneyStart;
  
  businessWorkflowTime.add(workflowTime);
  userJourneyTime.add(userJourneyTime_ms);
  workflowSuccess.add(workflowSuccessful ? 0 : 1);
  
  console.log(`Agent ${agent.agentId}: Workflow ${workflowSuccessful ? 'completed' : 'failed'} in ${workflowTime}ms`);
}

function loadDashboardWorkflow(frontendUrl, baseUrl, headers, agent) {
  const start = Date.now();
  let success = true;
  
  try {
    // Load frontend dashboard page
    const dashboardResponse = http.get(`${frontendUrl}/dashboard`, {
      headers: { 'User-Agent': 'k6-load-test/1.0' }
    });
    
    const frontendSuccess = check(dashboardResponse, {
      'Dashboard page loads': (r) => r.status === 200 || r.status === 302,
      'Dashboard responds quickly': (r) => r.timings.duration < 4000,
    });
    
    if (!frontendSuccess) success = false;
    
    // Make API call to get dashboard data (user profile)
    const userResponse = http.get(`${baseUrl}/api/users/me`, { headers });
    
    const apiSuccess = check(userResponse, {
      'User API responds': (r) => r.status === 200 || r.status === 401,
      'User API responds quickly': (r) => r.timings.duration < 3000,
    });
    
    if (!apiSuccess) success = false;
    
  } catch (error) {
    console.error(`Dashboard workflow failed: ${error.message}`);
    success = false;
    systemErrors.add(1);
  }
  
  const duration = Date.now() - start;
  endToEndTime.add(duration);
  
  return { success, duration };
}

function manageClientsWorkflow(clientServiceUrl, headers, agent) {
  const start = Date.now();
  let success = true;
  let createdClientId = null;
  
  try {
    // Get client list
    const clientsResponse = http.get(clientServiceUrl, { headers });
    
    const listSuccess = check(clientsResponse, {
      'Client list loads': (r) => r.status === 200 || r.status === 401,
      'Client list responds quickly': (r) => r.timings.duration < 4000,
    });
    
    if (!listSuccess) success = false;
    
    // Create a new client
    const newClient = {
      firstName: 'LoadTest',
      lastName: `Client_${agent.agentId}_${Date.now()}`,
      email: `loadtest.${agent.agentId}.${Date.now()}@example.com`,
      phoneNumber: `+1-555-01${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
      dateOfBirth: '1985-06-15',
      address: {
        street: `${Math.floor(Math.random() * 9999)} Test Avenue`,
        city: 'LoadTest City',
        state: 'CA',
        zipCode: '90210',
        country: 'US'
      }
    };
    
    const createResponse = http.post(clientServiceUrl, JSON.stringify(newClient), { headers });
    
    const createSuccess = check(createResponse, {
      'Client creation responds': (r) => r.status >= 200 && r.status < 500,
      'Client creation responds quickly': (r) => r.timings.duration < 5000,
    });
    
    if (createSuccess && createResponse.status === 201) {
      try {
        const responseBody = JSON.parse(createResponse.body);
        createdClientId = responseBody.id || responseBody.clientId;
      } catch (e) {
        console.log('Could not parse client creation response');
      }
    }
    
    if (!createSuccess) success = false;
    
    // Search for clients
    const searchResponse = http.get(`${clientServiceUrl}/search?query=LoadTest`, { headers });
    
    const searchSuccess = check(searchResponse, {
      'Client search responds': (r) => r.status === 200 || r.status === 401,
      'Client search responds quickly': (r) => r.timings.duration < 3000,
    });
    
    if (!searchSuccess) success = false;
    
    // If we created a client, try to get its details
    if (createdClientId) {
      const detailResponse = http.get(`${clientServiceUrl}/${createdClientId}`, { headers });
      
      const detailSuccess = check(detailResponse, {
        'Client detail retrieval works': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      });
      
      // Check data consistency
      if (detailResponse.status === 200) {
        try {
          const clientData = JSON.parse(detailResponse.body);
          const consistencyCheck = clientData.email === newClient.email;
          if (!consistencyCheck) {
            dataConsistencyErrors.add(1);
          }
        } catch (e) {
          dataConsistencyErrors.add(1);
        }
      }
    }
    
  } catch (error) {
    console.error(`Client management workflow failed: ${error.message}`);
    success = false;
    systemErrors.add(1);
  }
  
  const duration = Date.now() - start;
  endToEndTime.add(duration);
  
  return { success, duration, createdClientId };
}

function reviewTransactionsWorkflow(transactionServiceUrl, headers, agent) {
  const start = Date.now();
  let success = true;
  
  try {
    // Get transaction list
    const transactionsResponse = http.get(`${transactionServiceUrl}?page=0&size=20`, { headers });
    
    const listSuccess = check(transactionsResponse, {
      'Transaction list loads': (r) => r.status === 200 || r.status === 401,
      'Transaction list responds quickly': (r) => r.timings.duration < 6000,
    });
    
    if (!listSuccess) success = false;
    
    // Get transaction summary
    const summaryResponse = http.get(`${transactionServiceUrl}/summary`, { headers });
    
    const summarySuccess = check(summaryResponse, {
      'Transaction summary loads': (r) => r.status === 200 || r.status === 401,
      'Transaction summary responds quickly': (r) => r.timings.duration < 4000,
    });
    
    if (!summarySuccess) success = false;
    
    // Get daily stats
    const statsResponse = http.get(`${transactionServiceUrl}/stats/daily`, { headers });
    
    const statsSuccess = check(statsResponse, {
      'Transaction stats load': (r) => r.status === 200 || r.status === 401,
      'Transaction stats respond quickly': (r) => r.timings.duration < 4000,
    });
    
    if (!statsSuccess) success = false;
    
  } catch (error) {
    console.error(`Transaction review workflow failed: ${error.message}`);
    success = false;
    systemErrors.add(1);
  }
  
  const duration = Date.now() - start;
  endToEndTime.add(duration);
  
  return { success, duration };
}

function useAIFeaturesWorkflow(aiServiceUrl, headers, agent) {
  const start = Date.now();
  let success = true;
  
  try {
    // Ask AI guide a question
    const guideResponse = http.post(`${aiServiceUrl}/ai/guide/ask`, JSON.stringify({
      question: `Show me a summary of client activity for agent ${agent.agentId}`,
      context: { agentId: agent.agentId, timeRange: '7d' }
    }), { headers });
    
    const guideSuccess = check(guideResponse, {
      'AI guide responds': (r) => r.status >= 200 && r.status < 500,
      'AI guide responds in reasonable time': (r) => r.timings.duration < 12000,
    });
    
    if (!guideSuccess) success = false;
    
    // Natural language query
    const queryResponse = http.post(`${aiServiceUrl}/ai/query/natural`, JSON.stringify({
      query: 'What are the top 3 clients by transaction volume this month?',
      agentId: agent.agentId
    }), { headers });
    
    const querySuccess = check(queryResponse, {
      'Natural language query responds': (r) => r.status >= 200 && r.status < 500,
      'Natural language query responds in reasonable time': (r) => r.timings.duration < 15000,
    });
    
    if (!querySuccess) success = false;
    
  } catch (error) {
    console.error(`AI features workflow failed: ${error.message}`);
    success = false;
    systemErrors.add(1);
  }
  
  const duration = Date.now() - start;
  endToEndTime.add(duration);
  
  return { success, duration };
}

function checkAuditLogsWorkflow(auditServiceUrl, headers, agent) {
  const start = Date.now();
  let success = true;
  
  try {
    // Get recent audit logs
    const logsResponse = http.get(`${auditServiceUrl}/logs?hours=1&limit=10`, { headers });
    
    const logsSuccess = check(logsResponse, {
      'Audit logs load': (r) => r.status === 200 || r.status === 401,
      'Audit logs respond quickly': (r) => r.timings.duration < 4000,
    });
    
    if (!logsSuccess) success = false;
    
    // Get agent-specific logs
    const agentLogsResponse = http.get(`${auditServiceUrl}/logs?agentId=${agent.agentId}&limit=5`, { headers });
    
    const agentLogsSuccess = check(agentLogsResponse, {
      'Agent audit logs load': (r) => r.status === 200 || r.status === 401,
      'Agent audit logs respond quickly': (r) => r.timings.duration < 3000,
    });
    
    if (!agentLogsSuccess) success = false;
    
  } catch (error) {
    console.error(`Audit logs workflow failed: ${error.message}`);
    success = false;
    systemErrors.add(1);
  }
  
  const duration = Date.now() - start;
  endToEndTime.add(duration);
  
  return { success, duration };
}

export function teardown(data) {
  console.log('Full system load test completed');
  console.log('=== Test Summary ===');
  console.log(`Frontend URL: ${data.frontendUrl}`);
  console.log(`API Base URL: ${data.baseUrl}`);
  console.log('Check the detailed metrics in the k6 output for performance analysis');
}