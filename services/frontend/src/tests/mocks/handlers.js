import { http, HttpResponse } from 'msw';

// Mock data
export const mockUsers = [
  {
    userId: 'user-1',
    username: 'agent1',
    email: 'agent@test.com',
    firstName: 'Test',
    lastName: 'Agent',
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-15T10:00:00Z'
  },
  {
    userId: 'user-2',
    username: 'agent2',
    email: 'agent2@bankingbuddy.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: '2024-01-02T00:00:00Z',
    lastLoginAt: '2024-01-14T09:00:00Z'
  }
];

export const mockClients = [
  {
    clientId: 'client-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '555-0101',
    dateOfBirth: '1990-05-15',
    address: '123 Main St, Springfield',
    status: 'ACTIVE',
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    assignedAgentId: 'user-1'
  },
  {
    clientId: 'client-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phoneNumber: '555-0102',
    dateOfBirth: '1985-08-20',
    address: '456 Oak Ave, Springfield',
    status: 'ACTIVE',
    isVerified: false,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    assignedAgentId: 'user-1'
  },
  {
    clientId: 'client-3',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie.brown@example.com',
    phoneNumber: '555-0103',
    dateOfBirth: '1992-03-10',
    address: '789 Elm St, Springfield',
    status: 'INACTIVE',
    isVerified: true,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    assignedAgentId: 'user-2'
  }
];

export const mockTransactions = [
  {
    transactionId: 'txn-1',
    clientId: 'client-1',
    amount: 1500.00,
    transactionType: 'DEPOSIT',
    status: 'COMPLETED',
    description: 'Monthly salary deposit',
    transactionDate: '2024-01-15',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    transactionId: 'txn-2',
    clientId: 'client-1',
    amount: 250.00,
    transactionType: 'WITHDRAWAL',
    status: 'COMPLETED',
    description: 'ATM withdrawal',
    transactionDate: '2024-01-16',
    createdAt: '2024-01-16T14:30:00Z'
  },
  {
    transactionId: 'txn-3',
    clientId: 'client-2',
    amount: 2000.00,
    transactionType: 'DEPOSIT',
    status: 'PENDING',
    description: 'Check deposit',
    transactionDate: '2024-01-17',
    createdAt: '2024-01-17T09:15:00Z'
  }
];

export const mockCommunications = [
  {
    communicationId: 'comm-1',
    clientId: 'client-1',
    agentId: 'user-1',
    communicationType: 'EMAIL',
    subject: 'Account inquiry',
    content: 'Client asked about account balance',
    status: 'SENT',
    createdAt: '2024-01-15T11:00:00Z'
  },
  {
    communicationId: 'comm-2',
    clientId: 'client-2',
    agentId: 'user-1',
    communicationType: 'PHONE',
    subject: 'Transaction dispute',
    content: 'Discussed unauthorized transaction',
    status: 'SENT',
    createdAt: '2024-01-16T15:00:00Z'
  }
];

export const mockAuditLogs = [
  {
    auditId: 'audit-1',
    userId: 'user-1',
    action: 'LOGIN',
    resourceType: 'USER',
    resourceId: 'user-1',
    timestamp: '2024-01-15T10:00:00Z',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  },
  {
    auditId: 'audit-2',
    userId: 'user-1',
    action: 'UPDATE',
    resourceType: 'CLIENT',
    resourceId: 'client-1',
    timestamp: '2024-01-15T11:00:00Z',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }
];

// API Handlers
export const handlers = [
  // User Service handlers (port 8080)
  http.get('http://localhost:8080/api/users', () => {
    return HttpResponse.json({ data: mockUsers, message: 'Users retrieved successfully' });
  }),

  http.get('http://localhost:8080/api/users/:userId', ({ params }) => {
    const user = mockUsers.find(u => u.userId === params.userId);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: user, message: 'User retrieved successfully' });
  }),

  http.post('http://localhost:8080/api/users', async ({ request }) => {
    const newUser = await request.json();
    const user = {
      userId: `user-${Date.now()}`,
      ...newUser,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    mockUsers.push(user);
    return HttpResponse.json({ data: user, message: 'User created successfully' }, { status: 201 });
  }),

  http.patch('http://localhost:8080/api/users/:userId', async ({ params, request }) => {
    const updates = await request.json();
    const userIndex = mockUsers.findIndex(u => u.userId === params.userId);
    if (userIndex === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates };
    return HttpResponse.json({ data: mockUsers[userIndex], message: 'User updated successfully' });
  }),

  http.patch('http://localhost:8080/api/users/:userId/disable', async ({ params }) => {
    const userIndex = mockUsers.findIndex(u => u.userId === params.userId);
    if (userIndex === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    mockUsers[userIndex] = { ...mockUsers[userIndex], status: 'DISABLED' };
    return HttpResponse.json({ data: mockUsers[userIndex], message: 'User disabled successfully' });
  }),

  http.patch('http://localhost:8080/api/users/:userId/enable', async ({ params }) => {
    const userIndex = mockUsers.findIndex(u => u.userId === params.userId);
    if (userIndex === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    mockUsers[userIndex] = { ...mockUsers[userIndex], status: 'ACTIVE' };
    return HttpResponse.json({ data: mockUsers[userIndex], message: 'User enabled successfully' });
  }),

  http.delete('http://localhost:8080/api/users/:userId', ({ params }) => {
    const userIndex = mockUsers.findIndex(u => u.userId === params.userId);
    if (userIndex === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    mockUsers.splice(userIndex, 1);
    return HttpResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  }),

  // Client Service handlers (port 8081)
  http.get('http://localhost:8081/api/clients', ({ request }) => {
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');
    
    let filteredClients = mockClients;
    if (agentId) {
      filteredClients = mockClients.filter(c => c.assignedAgentId === agentId);
    }
    
    return HttpResponse.json({ data: filteredClients, message: 'Clients retrieved successfully' });
  }),

  http.get('http://localhost:8081/api/clients/:clientId', ({ params }) => {
    const client = mockClients.find(c => c.clientId === params.clientId);
    if (!client) {
      return HttpResponse.json({ message: 'Client not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: client, message: 'Client retrieved successfully' });
  }),

  http.post('http://localhost:8081/api/clients', async ({ request }) => {
    const newClient = await request.json();
    // Check for duplicate email
    if (mockClients.some(c => c.email === newClient.email)) {
      return HttpResponse.json(
        { message: 'Email already exists' },
        { status: 400 }
      );
    }
    const client = {
      clientId: `client-${Date.now()}`,
      ...newClient,
      status: 'ACTIVE',
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockClients.push(client);
    return HttpResponse.json({ data: client, message: 'Client created successfully' }, { status: 201 });
  }),

  http.put('http://localhost:8081/api/clients/:clientId', async ({ params, request }) => {
    const updates = await request.json();
    const clientIndex = mockClients.findIndex(c => c.clientId === params.clientId);
    if (clientIndex === -1) {
      return HttpResponse.json({ message: 'Client not found' }, { status: 404 });
    }
    mockClients[clientIndex] = {
      ...mockClients[clientIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return HttpResponse.json({ data: mockClients[clientIndex], message: 'Client updated successfully' });
  }),

  http.delete('http://localhost:8081/api/clients/:clientId', ({ params }) => {
    const clientIndex = mockClients.findIndex(c => c.clientId === params.clientId);
    if (clientIndex === -1) {
      return HttpResponse.json({ message: 'Client not found' }, { status: 404 });
    }
    mockClients.splice(clientIndex, 1);
    return HttpResponse.json({ message: 'Client deleted successfully' }, { status: 200 });
  }),

  http.post('http://localhost:8081/api/clients/:clientId/verify', ({ params }) => {
    const clientIndex = mockClients.findIndex(c => c.clientId === params.clientId);
    if (clientIndex === -1) {
      return HttpResponse.json({ message: 'Client not found' }, { status: 404 });
    }
    mockClients[clientIndex] = {
      ...mockClients[clientIndex],
      isVerified: true,
      updatedAt: new Date().toISOString()
    };
    return HttpResponse.json({ data: mockClients[clientIndex], message: 'Client verified successfully' });
  }),

  // Transaction Service handlers (on port 8081)
  http.get('http://localhost:8081/api/transactions', ({ request }) => {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    const status = url.searchParams.get('status');
    
    let filteredTransactions = mockTransactions;
    
    if (clientId) {
      filteredTransactions = filteredTransactions.filter(t => t.clientId === clientId);
    }
    
    if (status) {
      filteredTransactions = filteredTransactions.filter(t => t.status === status);
    }
    
    return HttpResponse.json({ data: filteredTransactions, message: 'Transactions retrieved successfully' });
  }),

  http.get('http://localhost:8081/api/transactions/:transactionId', ({ params }) => {
    const transaction = mockTransactions.find(t => t.transactionId === params.transactionId);
    if (!transaction) {
      return HttpResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: transaction, message: 'Transaction retrieved successfully' });
  }),

  http.get('http://localhost:8081/api/clients/:clientId/transactions', ({ params }) => {
    const filteredTransactions = mockTransactions.filter(t => t.clientId === params.clientId);
    return HttpResponse.json({ data: filteredTransactions, message: 'Transactions retrieved successfully' });
  }),

  http.post('http://localhost:8081/api/transactions', async ({ request }) => {
    const newTransaction = await request.json();
    const transaction = {
      transactionId: `txn-${Date.now()}`,
      ...newTransaction,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    mockTransactions.push(transaction);
    return HttpResponse.json({ data: transaction, message: 'Transaction created successfully' }, { status: 201 });
  }),

  http.post('http://localhost:8081/api/transactions/sync-sftp', async () => {
    return HttpResponse.json({ 
      data: {
        syncId: 'sync-' + Date.now(),
        status: 'IN_PROGRESS',
        transactionsProcessed: 10
      },
      message: 'SFTP sync initiated'
    });
  }),

  http.patch('http://localhost:8081/api/transactions/:transactionId', async ({ params, request }) => {
    const updates = await request.json();
    const transactionIndex = mockTransactions.findIndex(t => t.transactionId === params.transactionId);
    if (transactionIndex === -1) {
      return HttpResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }
    mockTransactions[transactionIndex] = {
      ...mockTransactions[transactionIndex],
      ...updates
    };
    return HttpResponse.json({ data: mockTransactions[transactionIndex], message: 'Transaction updated successfully' });
  }),

  // Communication Service handlers (on port 8081)
  http.get('http://localhost:8081/api/communications', ({ request }) => {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    
    let filteredCommunications = mockCommunications;
    if (clientId) {
      filteredCommunications = mockCommunications.filter(c => c.clientId === clientId);
    }
    
    return HttpResponse.json({ data: filteredCommunications, message: 'Communications retrieved successfully' });
  }),

  http.get('http://localhost:8081/api/communications/:communicationId', ({ params }) => {
    const communication = mockCommunications.find(c => c.communicationId === params.communicationId);
    if (!communication) {
      return HttpResponse.json({ message: 'Communication not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: communication, message: 'Communication retrieved successfully' });
  }),

  http.get('http://localhost:8081/api/communications/:communicationId/status', ({ params }) => {
    const communication = mockCommunications.find(c => c.communicationId === params.communicationId);
    if (!communication) {
      return HttpResponse.json({ message: 'Communication not found' }, { status: 404 });
    }
    return HttpResponse.json({ 
      data: { 
        communicationId: communication.communicationId,
        status: communication.status, 
        timestamp: communication.createdAt 
      },
      message: 'Communication status retrieved successfully'
    });
  }),

  http.get('http://localhost:8081/api/clients/:clientId/communications', ({ params }) => {
    const filteredCommunications = mockCommunications.filter(c => c.clientId === params.clientId);
    return HttpResponse.json({ data: filteredCommunications, message: 'Communications retrieved successfully' });
  }),

  http.post('http://localhost:8081/api/clients/:clientId/communications/email', async ({ params, request }) => {
    const emailData = await request.json();
    const communication = {
      communicationId: `comm-${Date.now()}`,
      clientId: params.clientId,
      agentId: 'user-1',
      ...emailData,
      communicationType: 'EMAIL',
      status: 'SENT',
      createdAt: new Date().toISOString()
    };
    mockCommunications.push(communication);
    return HttpResponse.json({ data: communication, message: 'Email sent successfully' }, { status: 201 });
  }),

  http.post('http://localhost:8081/api/communications', async ({ request }) => {
    const newCommunication = await request.json();
    const communication = {
      communicationId: `comm-${Date.now()}`,
      ...newCommunication,
      status: 'SENT',
      createdAt: new Date().toISOString()
    };
    mockCommunications.push(communication);
    return HttpResponse.json({ data: communication, message: 'Communication created successfully' }, { status: 201 });
  }),

  // Audit Service handlers (on port 8081)
  http.get('http://localhost:8081/api/audit', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const resourceType = url.searchParams.get('resourceType');
    
    let filteredLogs = mockAuditLogs;
    
    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }
    
    if (resourceType) {
      filteredLogs = filteredLogs.filter(log => log.resourceType === resourceType);
    }
    
    return HttpResponse.json({ data: filteredLogs, message: 'Audit logs retrieved successfully' });
  }),

  http.get('http://localhost:8081/api/audit-logs', ({ request }) => {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    let filteredLogs = mockAuditLogs;
    
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }
    
    return HttpResponse.json({ data: filteredLogs, message: 'Audit logs retrieved successfully' });
  }),

  http.get('http://localhost:8081/api/audit-logs/client/:clientId', ({ params }) => {
    const filteredLogs = mockAuditLogs.filter(log => log.resourceType === 'CLIENT' && log.resourceId === params.clientId);
    return HttpResponse.json({ data: filteredLogs, message: 'Audit logs retrieved successfully' });
  }),

  http.get('http://localhost:8081/api/audit-logs/agent/:agentId', ({ params }) => {
    const filteredLogs = mockAuditLogs.filter(log => log.userId === params.agentId);
    return HttpResponse.json({ data: filteredLogs, message: 'Audit logs retrieved successfully' });
  }),

  http.post('http://localhost:8081/api/audit', async ({ request }) => {
    const newLog = await request.json();
    const auditLog = {
      auditId: `audit-${Date.now()}`,
      ...newLog,
      timestamp: new Date().toISOString()
    };
    mockAuditLogs.push(auditLog);
    return HttpResponse.json({ data: auditLog, message: 'Audit log created successfully' }, { status: 201 });
  }),

  // Dashboard stats endpoint (on port 8081)
  http.get('http://localhost:8081/api/dashboard/stats', () => {
    return HttpResponse.json({
      data: {
        totalClients: mockClients.length,
        activeClients: mockClients.filter(c => c.status === 'ACTIVE').length,
        totalTransactions: mockTransactions.length,
        pendingTransactions: mockTransactions.filter(t => t.status === 'PENDING').length,
        completedTransactions: mockTransactions.filter(t => t.status === 'COMPLETED').length,
        totalTransactionVolume: mockTransactions.reduce((sum, t) => sum + t.amount, 0)
      },
      message: 'Dashboard stats retrieved successfully'
    });
  }),

  // Recent activity endpoint (on port 8081)
  http.get('http://localhost:8081/api/dashboard/recent-activity', () => {
    return HttpResponse.json({
      data: [
        ...mockTransactions.slice(-5).map(t => ({
          id: t.transactionId,
          type: 'transaction',
          description: `${t.transactionType} - ${t.description}`,
          timestamp: t.createdAt,
          clientId: t.clientId
        })),
        ...mockCommunications.slice(-3).map(c => ({
          id: c.communicationId,
          type: 'communication',
          description: `${c.communicationType} - ${c.subject}`,
          timestamp: c.createdAt,
          clientId: c.clientId
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10),
      message: 'Recent activity retrieved successfully'
    });
  })
];
