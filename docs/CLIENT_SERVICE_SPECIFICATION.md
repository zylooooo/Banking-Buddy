# Client Service - Technical Specification

**Version:** 1.0  
**Date:** October 20, 2025  
**Status:** Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
   - [Client Endpoints](#client-endpoints)
   - [Account Endpoints](#account-endpoints)
5. [Authorization Matrix](#authorization-matrix)
6. [Audit Logging Integration](#audit-logging-integration)
7. [Validation Rules](#validation-rules)
8. [Business Logic](#business-logic)
9. [Error Handling](#error-handling)

---

## Overview

The Client Service manages client profiles and their associated bank accounts for the Banking Buddy CRM system. It provides CRUD operations with role-based access control and asynchronous audit logging.

### Key Features

- **Client Profile Management**: Agents can create, view, update, verify, and delete (soft) client profiles
- **Account Management**: Agents create accounts for their clients; Admins can manage all accounts
- **Role-Based Access**: Agents access only their clients; Admins access all accounts
- **Soft Delete with Cascade**: Deleting clients cascades to accounts (when balance = 0)
- **Asynchronous Audit Logging**: Non-blocking SQS-based audit trail
- **Email Notifications**: SES email on client verification

### Technology Stack

- **Framework**: Spring Boot 3.5.6
- **Language**: Java 21
- **Database**: MySQL on Amazon RDS (AWS managed MySQL database) - Database: `crm_clients`
- **Authentication**: AWS Cognito (JWT via ALB)
- **Audit Logging**: AWS SQS → Lambda → DynamoDB
- **Email**: AWS SES
- **Caching** (future): AWS ElastiCache (design with Spring Cache abstraction)

---

## Architecture

### High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Application Load Balancer                │
│                    (JWT Validation + Injection)                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Client Service                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Controllers (ClientController, AccountController)       │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │  Services (ClientService, AccountService, EmailService)  │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │  Repositories (ClientRepository, AccountRepository)      │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │  Audit Publisher (AuditPublisher - SQS Client)           │   │
│  └────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────┼───────────────┬──────────────┐
              ▼             ▼               ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
       │   RDS    │   │   SQS    │   │   SES    │   │ Cognito  │
       │  MySQL   │   │  Queue   │   │  Email   │   │   JWT    │
       └──────────┘   └────┬─────┘   └──────────┘   └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Lambda    │
                    │ Audit Writer │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  DynamoDB    │
                    │  Audit Logs  │
                    └──────────────┘
```

### Service Layer Structure

```text
services/client-service/
├── src/
│   ├── main/
│   │   ├── java/com/BankingBuddy/client_service/
│   │   │   ├── ClientServiceApplication.java
│   │   │   ├── config/
│   │   │   │   ├── AwsConfig.java           # SQS, SES clients
│   │   │   │   ├── AwsProperties.java       # AWS config properties
│   │   │   │   ├── AppProperties.java       # App config
│   │   │   │   ├── SecurityConfig.java      # Spring Security
│   │   │   │   ├── WebConfig.java           # Interceptor registration
│   │   │   │   └── AuditConfig.java         # AuditPublisher bean
│   │   │   ├── controller/
│   │   │   │   ├── ClientController.java
│   │   │   │   └── AccountController.java
│   │   │   ├── model/
│   │   │   │   ├── entity/
│   │   │   │   │   ├── Client.java
│   │   │   │   │   └── Account.java
│   │   │   │   ├── dto/
│   │   │   │   │   ├── ClientDTO.java
│   │   │   │   │   ├── ClientSummaryDTO.java
│   │   │   │   │   ├── ClientWithAccountsDTO.java
│   │   │   │   │   ├── CreateClientRequest.java
│   │   │   │   │   ├── UpdateClientRequest.java
│   │   │   │   │   ├── AccountDTO.java
│   │   │   │   │   ├── AccountWithClientDTO.java
│   │   │   │   │   ├── CreateAccountRequest.java
│   │   │   │   │   ├── UpdateAccountRequest.java
│   │   │   │   │   └── ApiResponse.java
│   │   │   │   └── enums/
│   │   │   │       ├── Gender.java
│   │   │   │       ├── AccountType.java
│   │   │   │       └── AccountStatus.java
│   │   │   ├── repository/
│   │   │   │   ├── ClientRepository.java
│   │   │   │   └── AccountRepository.java
│   │   │   ├── service/
│   │   │   │   ├── ClientService.java
│   │   │   │   ├── AccountService.java
│   │   │   │   └── EmailService.java
│   │   │   ├── security/
│   │   │   │   ├── UserContext.java
│   │   │   │   ├── UserRole.java
│   │   │   │   ├── ALBUserContextExtractor.java
│   │   │   │   └── AuthorizationInterceptor.java
│   │   │   └── exception/
│   │   │       ├── ClientNotFoundException.java
│   │   │       ├── AccountNotFoundException.java
│   │   │       ├── ForbiddenException.java
│   │   │       ├── UnauthorizedException.java
│   │   │       ├── ClientAlreadyExistsException.java
│   │   │       ├── InvalidOperationException.java
│   │   │       └── GlobalExceptionHandler.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/
│   │           ├── V1__create_clients_database.sql
│   │           ├── V2__create_clients_table.sql
│   │           └── V3__create_accounts_table.sql
│   └── test/
├── Dockerfile
├── pom.xml
└── README.md
```

---

## Database Schema

### Database: `crm_clients`

#### Table: `clients`

```sql
CREATE TABLE clients (
    -- Primary Key
    client_id VARCHAR(255) PRIMARY KEY COMMENT 'UUID format: CLT-{UUID}',
    
    -- Foreign Key (Immutable)
    agent_id VARCHAR(255) NOT NULL COMMENT 'Foreign key to users.id in crm_users database',
    
    -- Personal Information
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Non-binary', 'Prefer not to say') NOT NULL,
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    
    -- Address Information
    address VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'Singapore',
    postal_code VARCHAR(10) NOT NULL,
    
    -- Status Flags
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_agent_id (agent_id),
    INDEX idx_email (email),
    INDEX idx_phone (phone_number),
    INDEX idx_deleted (deleted),
    INDEX idx_verified (verified),
    INDEX idx_agent_deleted (agent_id, deleted),
    
    -- Unique Constraints (excluding soft-deleted)
    UNIQUE KEY uk_email_not_deleted (email, deleted),
    UNIQUE KEY uk_phone_not_deleted (phone_number, deleted),
    
    -- Check Constraints
    CONSTRAINT chk_age CHECK (TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 18 AND 100),
    CONSTRAINT chk_first_name_length CHECK (CHAR_LENGTH(first_name) >= 2 AND CHAR_LENGTH(first_name) <= 50),
    CONSTRAINT chk_last_name_length CHECK (CHAR_LENGTH(last_name) >= 2 AND CHAR_LENGTH(last_name) <= 50),
    CONSTRAINT chk_address_length CHECK (CHAR_LENGTH(address) >= 5 AND CHAR_LENGTH(address) <= 100),
    CONSTRAINT chk_city_length CHECK (CHAR_LENGTH(city) >= 2 AND CHAR_LENGTH(city) <= 50),
    CONSTRAINT chk_state_length CHECK (CHAR_LENGTH(state) >= 2 AND CHAR_LENGTH(state) <= 50),
    CONSTRAINT chk_country_length CHECK (CHAR_LENGTH(country) >= 2 AND CHAR_LENGTH(country) <= 50),
    CONSTRAINT chk_postal_code_length CHECK (CHAR_LENGTH(postal_code) >= 4 AND CHAR_LENGTH(postal_code) <= 10),
    CONSTRAINT chk_phone_length CHECK (CHAR_LENGTH(phone_number) >= 10 AND CHAR_LENGTH(phone_number) <= 15)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: `accounts`

```sql
CREATE TABLE accounts (
    -- Primary Key
    account_id VARCHAR(255) PRIMARY KEY COMMENT 'UUID format: ACC-{UUID}',
    
    -- Foreign Key
    client_id VARCHAR(255) NOT NULL COMMENT 'Foreign key to clients.client_id',
    
    -- Account Information
    account_type ENUM('Savings', 'Checking', 'Business') NOT NULL,
    account_status ENUM('Active', 'Inactive', 'Pending') NOT NULL DEFAULT 'Pending',
    opening_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    initial_deposit DECIMAL(15, 2) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'SGD',
    branch_id VARCHAR(50) NOT NULL,
    
    -- Status Flag
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_client_id (client_id),
    INDEX idx_account_type (account_type),
    INDEX idx_account_status (account_status),
    INDEX idx_deleted (deleted),
    INDEX idx_opening_date (opening_date),
    INDEX idx_client_deleted (client_id, deleted),
    
    -- Foreign Key Constraint
    CONSTRAINT fk_accounts_client FOREIGN KEY (client_id) 
        REFERENCES clients(client_id) ON DELETE RESTRICT,
    
    -- Check Constraints
    CONSTRAINT chk_initial_deposit CHECK (initial_deposit > 0),
    CONSTRAINT chk_balance CHECK (balance >= 0),
    CONSTRAINT chk_branch_id_length CHECK (CHAR_LENGTH(branch_id) >= 3)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Note on Balance Field:**

- Added `balance DECIMAL(15, 2)` field to track account balance
- Initially set to `initial_deposit` value on account creation
- Used for validation during client/account deletion (must be 0)
- Future integration point for transaction-processor service

---

## API Endpoints

### Base URL

```HTTP
http://localhost:8080/api
```

### Authentication

All endpoints require JWT token in `x-amzn-oidc-data` header (injected by ALB).

**Temporary (Development):** Pass JWT directly in header  
**Production:** JWT passed as `Authorization: Bearer <token>`, ALB validates and injects `x-amzn-oidc-data`

---

## Client API Endpoints

### 1. Create Client Profile (Mook)

**API Endpoint:** `POST /api/clients`

**Access:** `AGENT` only

**Description:** Agent creates a new client profile. Agent ID is auto-populated from JWT.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "gender": "Male",
  "email": "john.doe@example.com",
  "phoneNumber": "+6591234567",
  "address": "123 Orchard Road",
  "city": "Singapore",
  "state": "Central",
  "country": "Singapore",
  "postalCode": "238858"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Client created successfully",
  "data": {
    "clientId": "CLT-550e8400-e29b-41d4-a716-446655440000",
    "agentId": "agent-uuid-from-jwt",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "Male",
    "email": "john.doe@example.com",
    "phoneNumber": "+6591234567",
    "address": "123 Orchard Road",
    "city": "Singapore",
    "state": "Central",
    "country": "Singapore",
    "postalCode": "238858",
    "verified": false,
    "deleted": false,
    "createdAt": "2025-10-20T10:30:00Z",
    "updatedAt": "2025-10-20T10:30:00Z"
  }
}
```

**Authorization:**

- Role: `AGENT`
- `agent_id` auto-populated from `UserContext.getUserId()`

**Audit Log (SQS Message):**

```json
{
  "log_id": "uuid",
  "timestamp": "2025-10-20T10:30:00Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-uuid-from-jwt",
  "crud_operation": "CREATE",
  "source_service": "client-service",
  "after_value": "John|Doe|john.doe@example.com|+6591234567|123 Orchard Road",
  "ttl": 1735660800
}
```

**Error Responses:**

- `400 Bad Request`: Validation errors (age, email format, etc.)
- `409 Conflict`: Email or phone already exists (not soft-deleted)
- `401 Unauthorized`: Missing or invalid JWT
- `403 Forbidden`: User role is not AGENT

---

### 2. Verify Client Identity (Mook)

**API Endpoint:** `POST /api/clients/{clientId}/verify`

**Access:** `AGENT` only (own clients)

**Description:** Marks client as verified and sends verification email via SES.

**Request:** Path parameter only (no body)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Client verified successfully",
  "data": null
}
```

**Business Logic:**

1. Query database to fetch client (via `clientRepository.findById()`)
2. Verify agent owns the client
3. Check if already verified (if yes, return success idempotently)
4. Update `verified = true` and save to database
5. **Send audit log to SQS** (log the verification status change)
6. **Send verification email via SES** (async, non-blocking with retry logic)
   - Implement retry mechanism: 3 attempts with exponential backoff (similar to audit logging)
   - If all retries fail, log error to **application logs** (CloudWatch/console), not audit service
   - Email failure does **not** affect response (still returns 200 OK)
   - Rationale: Email is notification only, not part of core business transaction
7. Return success response (200 OK)

**Implementation Note:** Uses repository pattern for database access, not internal HTTP calls.

**Authorization:**

- Role: `AGENT`
- Client must belong to agent
- Client must not be deleted

**Audit Log:**

```json
{
  "log_id": "uuid",
  "timestamp": "2025-10-20T15:00:00Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-uuid-from-jwt",
  "crud_operation": "UPDATE",
  "source_service": "client-service",
  "attribute_name": "Verification Status",
  "before_value": "Pending",
  "after_value": "Verified",
  "ttl": 1735661000
}
```

**Email (SES):**

```Text
To: john.doe@example.com
Subject: Your Banking Buddy Profile is Verified! ✓

Dear John Doe,

Great news! Your Banking Buddy client profile has been successfully verified.

Client ID: CLT-550e8400-e29b-41d4-a716-446655440000
Verified Date: October 20, 2025

You can now access all banking services available to verified clients.

If you have any questions, please contact your agent.

Best regards,
Banking Buddy Team
```

**Error Responses:**

- `404 Not Found`: Client not found or doesn't belong to agent
- `401 Unauthorized`: Missing or invalid JWT
- `403 Forbidden`: User role is not AGENT

**Note:** Email sending failures do not return errors. All SES errors are logged to CloudWatch and do not affect the HTTP response (always returns 200 OK if verification succeeds).

---

### 3. Update Client Information

**API Endpoint:** `PUT /api/clients/{clientId}`

**Access:** `AGENT` only (own clients)

**Description:** Updates client information with PATCH semantics. Accepts any subset of fields (partial or full update). Backend fetches current client state, compares with request, and only updates fields that have changed. Only fields with different values are logged. Cannot update `agent_id` or `verified` (use verify endpoint).

**Request (any subset of fields):**

```json
{
  "firstName": "John",
  "lastName": "Doe Jr.",
  "dateOfBirth": "1990-05-15",
  "gender": "Male",
  "email": "john.doe.jr@example.com",
  "phoneNumber": "+6591234567",
  "address": "456 Orchard Road #10-01",
  "city": "Singapore",
  "state": "Central",
  "country": "Singapore",
  "postalCode": "238859"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Client updated successfully",
  "data": {
    "clientId": "CLT-550e8400-e29b-41d4-a716-446655440000",
    "agentId": "agent-uuid-from-jwt",
    "firstName": "John",
    "lastName": "Doe Jr.",
    "fullName": "John Doe Jr.",
    "dateOfBirth": "1990-05-15",
    "gender": "Male",
    "email": "john.doe.jr@example.com",
    "phoneNumber": "+6591234567",
    "address": "456 Orchard Road #10-01",
    "city": "Singapore",
    "state": "Central",
    "country": "Singapore",
    "postalCode": "238859",
    "verified": true,
    "deleted": false,
    "createdAt": "2025-10-20T10:30:00Z",
    "updatedAt": "2025-10-20T14:22:00Z"
  }
}
```

**Authorization:**

- Role: `AGENT`
- Client must belong to agent
- Client must not be deleted

**Implementation Logic:**

1. Query database to fetch current client (via `clientRepository.findById()`)
2. Verify authorization (client belongs to agent)
3. Compare each field in request body with current database value
4. Only update fields where `request_value ≠ database_value`
5. For each changed field, create separate audit log entry to SQS
6. Save updated client to database
7. **Important:** If a field's value in the request matches the database value, skip that field entirely (no update, no log)

**Implementation Note:** Uses repository pattern for direct database queries, not internal HTTP calls.

**Audit Log (separate SQS message for EACH changed field):**

```json
{
  "log_id": "uuid",
  "timestamp": "2025-10-20T14:22:00Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-uuid-from-jwt",
  "crud_operation": "UPDATE",
  "source_service": "client-service",
  "attribute_name": "Last Name",
  "before_value": "Doe",
  "after_value": "Doe Jr.",
  "ttl": 1735660920
}
```

**Note:** Only log fields that actually changed. If request includes a field with the same value as database, do not create an audit log for that field.

**Error Responses:**

- `400 Bad Request`: Validation errors
- `404 Not Found`: Client not found or doesn't belong to agent
- `409 Conflict`: Email/phone already exists (different client)

---

### 4. Get Client Profile

**API Endpoint:** `GET /api/clients/{clientId}`

**Access:** `AGENT` only (own clients)

**Description:** Returns detailed client information **including all associated accounts**. Used when agent clicks into a client from "Manage Profiles" page.

**Request:** Path parameter `clientId`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Client retrieved successfully",
  "data": {
    "clientId": "CLT-550e8400-e29b-41d4-a716-446655440000",
    "agentId": "agent-uuid-from-jwt",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "Male",
    "email": "john.doe@example.com",
    "phoneNumber": "+6591234567",
    "address": "123 Orchard Road",
    "city": "Singapore",
    "state": "Central",
    "country": "Singapore",
    "postalCode": "238858",
    "verified": true,
    "deleted": false,
    "createdAt": "2025-10-20T10:30:00Z",
    "updatedAt": "2025-10-20T11:45:00Z",
    "accounts": [
      {
        "accountId": "ACC-123e4567-e89b-12d3-a456-426614174000",
        "accountType": "Savings",
        "accountStatus": "Active",
        "openingDate": "2025-10-20",
        "initialDeposit": 1000.00,
        "balance": 1500.00,
        "currency": "SGD",
        "branchId": "BRANCH-001",
        "deleted": false
      },
      {
        "accountId": "ACC-987f6543-e21c-34d5-b678-789012345678",
        "accountType": "Checking",
        "accountStatus": "Active",
        "openingDate": "2025-10-21",
        "initialDeposit": 500.00,
        "balance": 750.00,
        "currency": "SGD",
        "branchId": "BRANCH-001",
        "deleted": false
      }
    ]
  }
}
```

**Implementation Details:**

- Use JPA `@OneToMany` relationship or custom JOIN query via repository
- Fetch client and accounts in single database query to avoid N+1 problem
- Only return accounts where `deleted = false`
- Uses repository pattern for direct database access (no internal HTTP calls)

**Authorization:**

- Role: `AGENT`
- Client must belong to agent: `client.agent_id = UserContext.getUserId()`
- Client must not be deleted: `client.deleted = false`

**Audit Log (SQS Message):**

```json
{
  "log_id": "uuid",
  "timestamp": "2025-10-20T10:35:00Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-uuid-from-jwt",
  "crud_operation": "READ",
  "source_service": "client-service",
  "ttl": 1735660900
}
```

**Error Responses:**

- `404 Not Found`: Client not found or doesn't belong to agent
- `401 Unauthorized`: Missing or invalid JWT
- `403 Forbidden`: User role is not AGENT

---

### 5. DELETE /api/clients/{clientId} - Soft Delete Client

**Access:** `AGENT` only (own clients)

**Description:** Soft deletes client and cascades to all associated accounts (only if all accounts have balance = 0).

**Request:** Path parameter only

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Client and 2 associated accounts deleted successfully",
  "data": null
}
```

**Business Logic:**

1. Query database to fetch client (via `clientRepository.findById()`)
2. Verify agent owns the client
3. **Query database to fetch all client's accounts** (via `accountRepository.findByClientIdAndDeletedFalse()`)
4. **Check if ALL accounts have balance = 0**
   - If any account has balance > 0, throw error with list of accounts
5. Set `client.deleted = true` and save to database
6. Set `account.deleted = true` for ALL client's accounts (cascade) and save each
7. **Send audit log to SQS for client deletion**
8. **Send separate audit log to SQS for each account deletion**
9. Return success

**Implementation Note:** Uses repository pattern for direct database queries (no internal HTTP calls to GET endpoints).

**Authorization:**

- Role: `AGENT`
- Client must belong to agent
- Client must not already be deleted

**Audit Logs (multiple messages):**

Client deletion:

```json
{
  "log_id": "uuid",
  "timestamp": "2025-10-20T16:00:00Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-uuid-from-jwt",
  "crud_operation": "DELETE",
  "source_service": "client-service",
  "before_value": "John|Doe|john.doe@example.com|+6591234567",
  "ttl": 1735661600
}
```

Each account deletion (if 2 accounts):

```json
{
  "log_id": "uuid-1",
  "timestamp": "2025-10-20T16:00:01Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-uuid-from-jwt",
  "crud_operation": "DELETE",
  "source_service": "client-service",
  "before_value": "Account|ACC-123e4567-e89b-12d3-a456-426614174000|Savings|0.00",
  "ttl": 1735661601
}
```

```json
{
  "log_id": "uuid-2",
  "timestamp": "2025-10-20T16:00:02Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-uuid-from-jwt",
  "crud_operation": "DELETE",
  "source_service": "client-service",
  "before_value": "Account|ACC-987f6543-e21c-34d5-b678-789012345678|Checking|0.00",
  "ttl": 1735661602
}
```

**Error Responses:**

- `400 Bad Request`: One or more accounts have non-zero balance

  ```json
  {
    "success": false,
    "message": "Cannot delete client: 2 accounts have non-zero balance. Please zero out balances first.",
    "data": {
      "accountsWithBalance": [
        {
          "accountId": "ACC-123...",
          "accountType": "Savings",
          "balance": 1500.00
        },
        {
          "accountId": "ACC-987...",
          "accountType": "Checking",
          "balance": 750.00
        }
      ]
    }
  }
  ```

- `404 Not Found`: Client not found or doesn't belong to agent
- `409 Conflict`: Client already deleted

---

## Account Endpoints

### 6. Create Account

**API Endpoint:** `POST /api/accounts`

**Access:** `AGENT` only (for own clients)

**Description:** Agent creates a new account for one of their clients. Used on client detail page.

**Request:**

```json
{
  "clientId": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "accountType": "Savings",
  "accountStatus": "Pending",
  "initialDeposit": 1000.00,
  "currency": "SGD",
  "branchId": "BRANCH-001"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "accountId": "ACC-123e4567-e89b-12d3-a456-426614174000",
    "clientId": "CLT-550e8400-e29b-41d4-a716-446655440000",
    "accountType": "Savings",
    "accountStatus": "Pending",
    "openingDate": "2025-10-20",
    "initialDeposit": 1000.00,
    "balance": 1000.00,
    "currency": "SGD",
    "branchId": "BRANCH-001",
    "deleted": false,
    "createdAt": "2025-10-20T10:30:00Z",
    "updatedAt": "2025-10-20T10:30:00Z"
  }
}
```

**Business Logic:**

1. Verify `clientId` belongs to authenticated agent
2. Verify client is not soft-deleted
3. Create account with `balance = initialDeposit`
4. Audit log
5. Return created account

**Authorization:**

- Role: `AGENT`
- Client specified in request must belong to agent
- Client must not be deleted

**Audit Log:**

```json
{
  "log_id": "uuid",
  "timestamp": "2025-10-20T10:30:00Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-uuid-from-jwt",
  "crud_operation": "CREATE",
  "source_service": "client-service",
  "after_value": "Account|ACC-123e4567-e89b-12d3-a456-426614174000|Savings|1000.00|SGD",
  "ttl": 1735660800
}
```

**Error Responses:**

- `400 Bad Request`: Invalid account type, initial deposit <= 0, branch ID too short
- `404 Not Found`: Client not found or doesn't belong to agent
- `403 Forbidden`: Client is soft-deleted

---

### 7. DELETE /api/accounts/{accountId} - Soft Delete Account

**Access:**

- `AGENT` (for own clients' accounts)
- `ADMIN` and `ROOT_ADMIN` (for all accounts)

**Description:** Soft deletes account. **Can only delete if balance = 0.**

**Request:** Path parameter only

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": null
}
```

**Business Logic:**

1. Fetch account
2. **Check if balance = 0** (if not, throw error)
3. For AGENT: Verify account's client belongs to agent
4. Set `account.deleted = true`
5. Audit log
6. Return success

**Authorization:**

- Role: `AGENT`, `ADMIN`, or `ROOT_ADMIN`
- For AGENT: Account's client must belong to agent
- Account must not already be deleted
- **Account balance must be 0**

**Audit Log:**

```json
{
  "log_id": "uuid",
  "timestamp": "2025-10-20T16:00:00Z",
  "client_id": "CLT-550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agent-or-admin-uuid",
  "crud_operation": "DELETE",
  "source_service": "client-service",
  "before_value": "Account|ACC-123e4567-e89b-12d3-a456-426614174000|Savings|0.00",
  "ttl": 1735661600
}
```

**Error Responses:**

- `400 Bad Request`: Account has non-zero balance

  ```json
  {
    "success": false,
    "message": "Cannot delete account with non-zero balance",
    "data": {
      "accountId": "ACC-123e4567-e89b-12d3-a456-426614174000",
      "currentBalance": 1500.00
    }
  }
  ```

- `404 Not Found`: Account not found
- `403 Forbidden`: Agent doesn't own the client
- `409 Conflict`: Account already deleted

---

## Additional Endpoints (Mook)

These endpoints provide list/summary views for managing clients and accounts.

### Client Endpoints

#### Get All Clients for Agent (Mook)

**API Endpoint:** `GET /api/clients`

**Access:** `AGENT` only

**Description:** Returns summary of all non-deleted clients belonging to the authenticated agent. Used for "Manage Profiles" page.

**Request:** None (agent_id from JWT)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Clients retrieved successfully",
  "data": [
    {
      "clientId": "CLT-550e8400-e29b-41d4-a716-446655440000",
      "fullName": "John Doe",
      "verified": true,
      "email": "john.doe@example.com",
      "phoneNumber": "+6591234567"
    },
    {
      "clientId": "CLT-75ef3acb-e531-4bfe-8762-8cc7f7336806",
      "fullName": "Jane Smith",
      "verified": false,
      "email": "jane.smith@example.com",
      "phoneNumber": "+6598765432"
    }
  ]
}
```

**Authorization:**

- Role: `AGENT`
- Query: `WHERE agent_id = ? AND deleted = false`

**Audit Log:** None (bulk read not logged)

**Error Responses:**

- `401 Unauthorized`: Missing or invalid JWT
- `403 Forbidden`: User role is not AGENT

---

### Account API Endpoints

#### Get All Accounts (Admin Only) (Mook)

**API Endpoint:** `GET /api/accounts`

**Access:** `ADMIN` and `ROOT_ADMIN` only

**Description:** Returns all non-deleted accounts with client information. Used for admin "Manage Accounts" page.

**Request:** None

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Accounts retrieved successfully",
  "data": [
    {
      "accountId": "ACC-123e4567-e89b-12d3-a456-426614174000",
      "accountType": "Savings",
      "accountStatus": "Active",
      "openingDate": "2025-10-20",
      "initialDeposit": 1000.00,
      "balance": 1500.00,
      "currency": "SGD",
      "branchId": "BRANCH-001",
      "clientId": "CLT-550e8400-e29b-41d4-a716-446655440000",
      "clientFullName": "John Doe",
      "agentId": "agent-uuid-123",
      "deleted": false
    },
    {
      "accountId": "ACC-987f6543-e21c-34d5-b678-789012345678",
      "accountType": "Checking",
      "accountStatus": "Active",
      "openingDate": "2025-10-21",
      "initialDeposit": 5000.00,
      "balance": 4750.00,
      "currency": "SGD",
      "branchId": "BRANCH-002",
      "clientId": "CLT-75ef3acb-e531-4bfe-8762-8cc7f7336806",
      "clientFullName": "Jane Smith",
      "agentId": "agent-uuid-456",
      "deleted": false
    }
  ]
}
```

**Implementation:**

```sql
SELECT 
    a.account_id, a.account_type, a.account_status, a.opening_date,
    a.initial_deposit, a.balance, a.currency, a.branch_id, a.deleted,
    c.client_id, 
    CONCAT(c.first_name, ' ', c.last_name) AS client_full_name,
    c.agent_id
FROM accounts a
JOIN clients c ON a.client_id = c.client_id
WHERE a.deleted = false AND c.deleted = false
ORDER BY a.created_at DESC;
```

**Authorization:**

- Role: `ADMIN` or `ROOT_ADMIN`

**Audit Log:** None (bulk read not logged for admin)

**Error Responses:**

- `401 Unauthorized`: Missing or invalid JWT
- `403 Forbidden`: User role is AGENT

---

## Authorization Matrix

| Endpoint | AGENT | ADMIN | ROOT_ADMIN | Notes |
|----------|-------|-------|------------|-------|
| **Main Client Endpoints** | | | | |
| POST /api/clients | ✅ (create) | ❌ | ❌ | Agent creates clients |
| POST /api/clients/{id}/verify | ✅ (own only) | ❌ | ❌ | Sends email via SES |
| PUT /api/clients/{id} | ✅ (own only) | ❌ | ❌ | PATCH semantics, logs only changed fields |
| GET /api/clients/{id} | ✅ (own only) | ❌ | ❌ | Includes client's accounts |
| DELETE /api/clients/{id} | ✅ (own only) | ❌ | ❌ | Cascades if all accounts balance=0 |
| **Main Account Endpoints** | | | | |
| POST /api/accounts | ✅ (own clients) | ❌ | ❌ | Agent creates for own clients |
| DELETE /api/accounts/{id} | ✅ (own clients) | ✅ | ✅ | Requires balance=0 |
| **Additional Endpoints** | | | | |
| GET /api/clients | ✅ (own only) | ❌ | ❌ | Agent lists own clients (summary) |
| GET /api/accounts | ❌ | ✅ | ✅ | Admin views all accounts |

**Key Authorization Rules:**

1. **Agents:**
   - Can only access clients where `client.agent_id = their_user_id`
   - Can only access accounts belonging to their clients
   - Cannot access admin functions
2. **Admins:**
   - Cannot create or manage clients (that's agent responsibility)
   - Can view and manage ALL accounts
   - Can delete any account (if balance = 0)
3. **Balance = 0 Requirement:**
   - Account deletion: Always requires balance = 0
   - Client deletion: ALL client's accounts must have balance = 0

---

## Audit Logging Integration

### Architecture Change: SQS-Based Logging

**Previous:** Synchronous writes to DynamoDB (mission-critical)  
**Current:** Asynchronous publishing to SQS (non-blocking, fire-and-forget)

```text
Client Service → SQS Queue → Lambda (audit-writer) → DynamoDB
                     ↓
              Dead Letter Queue (DLQ)
```

### Implementation: AuditPublisher Bean

**Dependency:** `services/shared/java` (audit-logging-client library)

```xml
<dependency>
    <groupId>com.bankingbuddy</groupId>
    <artifactId>audit-logging-client</artifactId>
    <version>1.0.0</version>
</dependency>
```

**Configuration (application.properties):**

```properties
# Audit Logging
audit.sqs.queue.url=${AUDIT_SQS_QUEUE_URL}
audit.source.service=client-service
audit.log.retention.days=30
```

**Bean Configuration:**

```java
@Configuration
public class AuditConfig {
    
    @Bean
    public SqsClient sqsClient(AwsProperties awsProperties) {
        return SqsClient.builder()
            .region(Region.of(awsProperties.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(
                    awsProperties.getAccessKeyId(),
                    awsProperties.getSecretAccessKey()
                )
            ))
            .build();
    }
    
    @Bean
    public AuditPublisher auditPublisher(
            SqsClient sqsClient,
            @Value("${audit.sqs.queue.url}") String queueUrl,
            @Value("${audit.source.service}") String sourceService,
            @Value("${audit.log.retention.days:30}") long retentionDays) {
        return new AuditPublisher(sqsClient, queueUrl, sourceService, retentionDays);
    }
}
```

### Usage in Service Layer

```java
@Service
public class ClientService {
    
    private final AuditPublisher auditPublisher;
    
    // CREATE operation
    public ClientDTO createClient(CreateClientRequest request, UserContext currentUser) {
        // ... business logic ...
        Client saved = clientRepository.save(client);
        
        // Audit log (non-blocking, won't fail if SQS is down)
        auditPublisher.logCreate(
            saved.getClientId(),
            currentUser.getUserId(),
            String.format("%s|%s|%s|%s|%s",
                saved.getFirstName(),
                saved.getLastName(),
                saved.getEmail(),
                saved.getPhoneNumber(),
                saved.getAddress()
            )
        );
        
        return mapToDTO(saved);
    }
    
    // UPDATE operation (log each changed field)
    public ClientDTO updateClient(String clientId, UpdateClientRequest request, 
                                  UserContext currentUser) {
        Client existing = findClient(clientId, currentUser);
        
        // Track changes
        if (!existing.getLastName().equals(request.getLastName())) {
            auditPublisher.logUpdate(
                clientId,
                currentUser.getUserId(),
                "Last Name",
                existing.getLastName(),
                request.getLastName()
            );
        }
        
        if (!existing.getEmail().equals(request.getEmail())) {
            auditPublisher.logUpdate(
                clientId,
                currentUser.getUserId(),
                "Email Address",
                existing.getEmail(),
                request.getEmail()
            );
        }
        
        // ... update and save ...
        
        return mapToDTO(updated);
    }
    
    // DELETE with cascade
    @Transactional
    public void deleteClient(String clientId, UserContext currentUser) {
        Client client = findClient(clientId, currentUser);
        
        // Fetch accounts and validate balance
        List<Account> accounts = accountRepository.findByClientIdAndDeletedFalse(clientId);
        List<Account> accountsWithBalance = accounts.stream()
            .filter(a -> a.getBalance().compareTo(BigDecimal.ZERO) > 0)
            .toList();
            
        if (!accountsWithBalance.isEmpty()) {
            throw new InvalidOperationException(
                "Cannot delete client: " + accountsWithBalance.size() + 
                " accounts have non-zero balance"
            );
        }
        
        // Soft delete client
        client.setDeleted(true);
        clientRepository.save(client);
        
        // Audit log client deletion
        auditPublisher.logDelete(
            clientId,
            currentUser.getUserId(),
            String.format("%s|%s|%s|%s",
                client.getFirstName(),
                client.getLastName(),
                client.getEmail(),
                client.getPhoneNumber()
            )
        );
        
        // Cascade soft delete accounts
        for (Account account : accounts) {
            account.setDeleted(true);
            accountRepository.save(account);
            
            // Audit log each account deletion
            auditPublisher.logDelete(
                clientId,
                currentUser.getUserId(),
                String.format("Account|%s|%s|%.2f",
                    account.getAccountId(),
                    account.getAccountType(),
                    account.getBalance()
                )
            );
        }
    }
}
```

### SQS Message Schema

**Required Fields (All Operations):**

- `log_id` (UUID)
- `timestamp` (ISO 8601 with 'Z')
- `client_id` (String)
- `agent_id` (String)
- `crud_operation` (CREATE, READ, UPDATE, DELETE)
- `source_service` (String - "client-service")
- `ttl` (Unix timestamp)

**Conditional Fields:**

- `after_value` - Required for CREATE and UPDATE
- `before_value` - Required for UPDATE and DELETE
- `attribute_name` - Required for UPDATE

### Error Handling

**Non-Blocking:** If SQS publish fails, the main operation continues.

```java
// In AuditPublisher.publishAuditMessage()
catch (SqsException e) {
    logger.error("Failed to publish audit message to SQS: {} (Code: {})", 
                e.getMessage(), e.awsErrorDetails().errorCode());
    // Non-blocking: don't throw exception
    // Operation continues successfully
}
```

**SQS Retry Policy:**

- Client-service will NOT retry if SQS publish fails
- SQS has built-in DLQ for failed Lambda processing
- Main CRUD operation is not affected by logging failures

---

## Validation Rules

### Client Validation

| Field | Validation | Business Rule |
|-------|------------|---------------|
| Client ID | System-generated UUID | Format: `CLT-{UUID}`, unique, non-editable |
| First Name | Required, 2-50 chars, alphabetic + spaces | Must contain only letters and spaces |
| Last Name | Required, 2-50 chars, alphabetic + spaces | Must contain only letters and spaces |
| Date of Birth | Required, valid date, past | Age 18-100 years |
| Gender | Required, enum | Male, Female, Non-binary, Prefer not to say |
| Email | Required, valid email format | Must be unique (excluding soft-deleted) |
| Phone Number | Required, 10-15 digits | Must be unique (excluding soft-deleted) |
| Address | Required, 5-100 chars | - |
| City | Required, 2-50 chars | - |
| State | Required, 2-50 chars | - |
| Country | Required, 2-50 chars | Default: "Singapore" |
| Postal Code | Required, 4-10 chars | Must match country's format |
| Agent ID | Auto-assigned from JWT | Immutable, references users.id |
| Verified | Boolean | Default: false, changed via verify endpoint |
| Deleted | Boolean | Default: false, soft delete flag |

### Account Validation

| Field | Validation | Business Rule |
|-------|------------|---------------|
| Account ID | System-generated UUID | Format: `ACC-{UUID}`, unique, non-editable |
| Client ID | Required, must exist | Foreign key to clients.client_id |
| Account Type | Required, enum | Savings, Checking, Business |
| Account Status | Required, enum | Active, Inactive, Pending (default) |
| Opening Date | Auto-assigned | Current date |
| Initial Deposit | Required, > 0 | Must be positive decimal |
| Balance | Auto-assigned = initialDeposit | Updated by transaction service |
| Currency | Required | Default: "SGD" |
| Branch ID | Required, min 3 chars | Free text (mock data) |
| Deleted | Boolean | Default: false |

### Business Rules

1. **Email/Phone Uniqueness:** Only among non-deleted clients

   ```sql
   UNIQUE KEY uk_email_not_deleted (email, deleted)
   UNIQUE KEY uk_phone_not_deleted (phone_number, deleted)
   ```

2. **Agent Ownership:** Agents can only access clients where `agent_id = their_user_id`

3. **Cascade Delete Rules:**
   - Client deletion cascades to ALL accounts
   - All accounts must have `balance = 0` before client can be deleted
   - If any account has balance > 0, throw `400 Bad Request`

4. **Account Delete Rule:**
   - Can only delete account if `balance = 0`
   - Applies to both agents and admins

5. **Verified Status:**
   - Cannot be changed via PUT endpoint
   - Only changed via POST /clients/{id}/verify
   - Triggers email notification

---

## Business Logic

### Client Creation Flow

```text
1. Agent submits CreateClientRequest
2. Extract agent_id from UserContext (JWT)
3. Validate email/phone uniqueness (excluding soft-deleted)
4. Validate age (18-100)
5. Generate client_id = "CLT-" + UUID
6. Set verified = false, deleted = false
7. Set agent_id = currentUser.getUserId() (immutable)
8. Save to database
9. Publish CREATE audit log to SQS (non-blocking)
10. Return ClientDTO
```

### Client Verification Flow

```text
1. Agent requests to verify client
2. Verify agent owns client
3. Check if already verified (idempotent)
4. Update verified = true
5. Publish UPDATE audit log to SQS (attribute: "Verification Status")
6. Send verification email via SES (async, non-blocking)
   - If email fails, log error but still return success
7. Return success
```

### Client Update Flow

```text
1. Agent submits UpdateClientRequest
2. Verify agent owns client
3. Fetch existing client
4. Compare each field for changes
5. For each changed field:
   a. Validate new value
   b. Publish UPDATE audit log to SQS (separate message per field)
6. Update client in database
7. Return updated ClientDTO
```

### Client Deletion Flow (with Cascade)

```text
1. Agent requests to delete client
2. Verify agent owns client
3. Fetch ALL client's accounts (including soft-deleted = false)
4. Check each account's balance:
   - If ANY account has balance > 0, throw 400 Bad Request with details
5. Set client.deleted = true
6. Publish client DELETE audit log to SQS
7. For each account:
   a. Set account.deleted = true
   b. Publish account DELETE audit log to SQS
8. Return success with count of deleted accounts
```

### Account Creation Flow

```text
1. Agent submits CreateAccountRequest with clientId
2. Verify agent owns the specified client
3. Verify client is not soft-deleted
4. Validate accountType, initialDeposit > 0, branchId >= 3 chars
5. Generate account_id = "ACC-" + UUID
6. Set balance = initialDeposit
7. Set opening_date = current date
8. Set accountStatus = "Pending" (default)
9. Set deleted = false
10. Save to database
11. Publish CREATE audit log to SQS
12. Return AccountDTO
```

### Account Deletion Flow

```text
1. User (Agent or Admin) requests to delete account
2. Fetch account
3. Check balance = 0:
   - If balance > 0, throw 400 Bad Request
4. For Agent: Verify account's client belongs to agent
5. Set account.deleted = true
6. Publish DELETE audit log to SQS
7. Return success
```

### GET Client with Accounts (JOIN Query)

```text
1. Agent requests client details
2. Verify agent owns client
3. Fetch client with LEFT JOIN to accounts:
   SELECT c.*, a.*
   FROM clients c
   LEFT JOIN accounts a ON c.client_id = a.client_id AND a.deleted = false
   WHERE c.client_id = ? AND c.agent_id = ? AND c.deleted = false
4. Map to ClientWithAccountsDTO
5. Publish READ audit log to SQS
6. Return ClientWithAccountsDTO
```

**Alternative (JPA):**
Use `@OneToMany` with `fetch = FetchType.EAGER` or `@EntityGraph`

---

## Error Handling for HTTP requests

### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ClientNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleClientNotFound(ClientNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error(ex.getMessage()));
    }
    
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.error(ex.getMessage()));
    }
    
    @ExceptionHandler(InvalidOperationException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidOperation(InvalidOperationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(ex.getMessage()));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error("Validation failed", errors));
    }
}
```

### HTTP Status Codes

| Status Code | Usage |
|-------------|-------|
| 200 OK | Successful GET, PUT, DELETE operations |
| 201 Created | Successful POST operations (create) |
| 400 Bad Request | Validation errors, business rule violations (e.g., balance > 0) |
| 401 Unauthorized | Missing or invalid JWT |
| 403 Forbidden | Insufficient permissions (wrong role, not owner) |
| 404 Not Found | Resource not found or doesn't belong to user |
| 409 Conflict | Resource already exists (email/phone), already deleted |
| 500 Internal Server Error | Unexpected server errors |

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "data": null
}
```

**With Validation Errors:**

```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "firstName": "First name must be between 2 and 50 characters",
    "email": "Email address is not valid",
    "dateOfBirth": "Age must be between 18 and 100 years"
  }
}
```

---

## Environment Variables

```properties
# Database
DB_URL=jdbc:mysql://localhost:3306/crm_clients
DB_USERNAME=client_service_user
DB_PASSWORD=secure_password

# AWS Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# AWS Cognito
COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX

# AWS SQS (Audit Logging)
AUDIT_SQS_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/123456789/dev-banking-buddy-audit-logs

# AWS SES (Email)
SES_SENDER_EMAIL=noreply@bankingbuddy.com

# Application
APP_SECURITY_ENABLED=true
CORS_ALLOWED_ORIGINS=*

# Audit Configuration
AUDIT_SOURCE_SERVICE=client-service
AUDIT_LOG_RETENTION_DAYS=30
```

---

**Last Updated:** October 20, 2025
