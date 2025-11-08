# AI Service

AI-powered features for Banking Buddy CRM System, providing intelligent assistance and natural language query capabilities.

## Overview

The AI Service integrates OpenAI's language models to provide two main features:

1. **AI Help Guide** - Contextual help and documentation assistance
2. **CRM Assistant** - Natural language queries for CRM data

## Features

### 1. AI Help Guide

- Role-based documentation filtering
- Context-aware help responses
- Guides users through CRM operations
- Markdown-formatted responses

### 2. CRM Assistant (Natural Language Query)

- Query CRM data using natural language
- Role-based query restrictions
- Intelligent intent parsing with name filtering
- Context-aware query routing
- Smart scope detection (personal vs system-wide)
- AI-generated natural language summaries for all query types

## Architecture

### Components

```text
ai-service/
├── controller/
│   ├── AiGuideController.java         # AI Help Guide endpoints
│   └── NaturalLanguageQueryController.java  # CRM Assistant endpoints
├── service/
│   ├── AiGuideService.java            # Help documentation service
│   ├── NaturalLanguageQueryService.java     # Query processing & routing
│   └── OpenAIService.java             # OpenAI API integration
├── security/
│   ├── ALBUserContextExtractor.java   # Extracts user from ALB headers
│   ├── AuthorizationInterceptor.java  # Request authorization
│   └── UserRole.java                  # Role enum (AGENT, ADMIN, ROOT_ADMIN)
└── resources/
    └── docs/
        └── guide.txt                  # CRM documentation content
```

### Service Communication

The AI Service communicates with other microservices:

- **User Service** - User and agent management queries
- **Client Service** - Client and account queries
- **Transaction Service** - Transaction queries

## Role-Based Access Control

### AGENT

**Can Query:**

- Own clients: `"show my clients"`
- Client transactions: `"show transactions for client John"`
- Personal accounts: `"show accounts I manage"` (routes to clients)

**Cannot Query:**

- All accounts (system-wide)
- Other agents' data
- Agent or admin information

### ADMIN

**Can Query:**

- Agents they created: `"show agents I manage"`
- Personal accounts: `"show my accounts"` (routes to their agents)

**Cannot Query:**

- All accounts (system-wide)
- Client information directly
- Transaction data
- Other admins' agents

### ROOT_ADMIN

**Can Query:**

- All agents: `"show all agents"`
- All admins: `"show all admins"`
- Combined users: `"show agents and admins"`
- All accounts: `"show all accounts"` (system-wide)

**Cannot Query:**

- Transaction data (agent-only operational data)
- Client information directly

## Natural Language Query Processing

### Query Flow

```text
1. User submits query
   ↓
2. OpenAI parses intent & extracts parameters
   ↓
3. Classify query type: client | transaction | account | agent | admin | users | general
   ↓
4. Check scope: personal ("my", "I manage") vs broad ("all", "show")
   ↓
5. Route to appropriate handler based on role & scope
   ↓
6. Fetch data from microservices
   ↓
7. Generate natural language response
   ↓
8. Return results + formatted response
```

### Smart "Account" Query Routing

The system interprets "accounts" contextually based on role:

| Query | AGENT | ADMIN | ROOT_ADMIN |
|-------|-------|-------|------------|
| `"show my accounts"` | → Clients | → Agents | → All Users |
| `"accounts I manage"` | → Clients | → Agents | → All Users |
| `"show all accounts"` | ❌ Blocked | ❌ Blocked | → All Users |

### Scope Detection

**Personal Scope** (allowed for all roles):

- Keywords: `my`, `mine`, `I manage`, `I have`, `for my`, `under me`
- Example: `"show my accounts"` → Routes to role-appropriate entity

**Broad Scope** (ROOT_ADMIN only):

- Keywords: `all`, `every`, or no personal keywords
- Example: `"show all accounts"` → System-wide query

## API Endpoints

### AI Help Guide

#### Ask Question

```http
POST /api/ai/guide/ask
Content-Type: application/json
Authorization: Bearer <token>

{
  "question": "How do I create a client?"
}
```

**Response:**

```json
{
  "answer": "To create a client...",
  "status": "success"
}
```

### CRM Assistant

#### Process Query

```http
POST /api/ai/query
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "Show me all my clients"
}
```

**Response:**

```json
{
  "naturalLanguageResponse": "Found 5 clients.",
  "queryType": "client",
  "results": [
    {
      "clientId": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "verified": true
    }
  ],
  "sqlQuery": "GET /api/clients"
}
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `OPENAI_API_URL` | OpenAI API URL | No | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | OpenAI model | No | `gpt-4o-mini` |
| `SERVICES_CLIENT_SERVICE_URL` | Client service URL | No | `http://client-service:8081` |
| `SERVICES_TRANSACTION_SERVICE_URL` | Transaction service URL | No | `http://transaction-service:8082` |
| `SERVICES_USER_SERVICE_URL` | User service URL | No | `http://user-service:8080` |
| `SERVER_PORT` | Service port | No | `8083` |

## Configuration

### OpenAI Configuration

The service uses OpenAI for:

1. **Intent Parsing** - Determining query type, extracting parameters (names, dates, etc.)
2. **Response Generation** - Creating natural language summaries for ALL query types (clients, transactions, agents, admins)
3. **Help Documentation** - Providing contextual assistance

All query responses are dynamically generated by OpenAI to provide conversational, context-aware summaries.

**Configuration Parameters** (set in `application.properties`):
- **Model**: `gpt-4o-mini` (via `openai.model`)
- **Temperature**: `0.3` (via `openai.temperature`)
- **Max Tokens**: `1000` (via `openai.max-tokens`)
- **Timeout**: `30 seconds` (via `openai.timeout-seconds`)

**Microservice Timeouts**:
- Client/Transaction/User service calls: `10 seconds` (via `services.timeout`)

### Security

Authentication is handled via:

- AWS ALB with Cognito integration
- JWT token validation
- Role-based authorization interceptor

Headers:

- `Authorization: Bearer <token>`
- `x-amzn-oidc-data: <token>` (ALB)

## Query Examples

### Agent Examples

```text
✅ "Show me all my clients"
✅ "Find client named John"
✅ "Show Pablo's transactions"
✅ "Show accounts I manage" (routes to clients)
✅ "Show transactions for client Paul"
✅ "List transactions from last month"
✅ "Find clients named Sarah"

❌ "Show all accounts" (blocked - broad scope)
❌ "Show all agents" (no permission)
```

### Admin Examples

```text
✅ "Show agents I manage"
✅ "How many agents do I have"
✅ "Show my accounts" (routes to agents)
✅ "Find agent named Sarah"
✅ "Show agent John"
✅ "List agents named Smith"

❌ "Show all accounts" (blocked - broad scope)
❌ "Show all clients" (no permission)
❌ "Show transactions" (no permission)
```

### Root Admin Examples

```text
✅ "Show me all agents"
✅ "Show me all admins"
✅ "Show agents and admins"
✅ "Show all accounts" (system-wide)
✅ "Find agent named Mike"
✅ "Show admin Sarah"
✅ "List administrators named Johnson"

❌ "Show all transactions" (agent-only data)
❌ "Show all clients" (no permission)
```

## Development

### Prerequisites

- Java 21
- Maven 3.8+
- OpenAI API key
- Access to other Banking Buddy microservices

### Running Locally

```bash
# Set environment variables
export OPENAI_API_KEY=your_openai_key
export SERVICES_CLIENT_SERVICE_URL=http://localhost:8081
export SERVICES_TRANSACTION_SERVICE_URL=http://localhost:8082
export SERVICES_USER_SERVICE_URL=http://localhost:8080

# Build and run
mvn clean install
mvn spring-boot:run
```

### Running with Docker

```bash
docker build -t banking-buddy-ai-service .
docker run -p 8083:8083 \
  -e OPENAI_API_KEY=your_key \
  -e SERVICES_CLIENT_SERVICE_URL=http://client-service:8081 \
  -e SERVICES_TRANSACTION_SERVICE_URL=http://transaction-service:8082 \
  -e SERVICES_USER_SERVICE_URL=http://user-service:8080 \
  banking-buddy-ai-service
```

### Testing

```bash
# Run unit tests
mvn test

# Run integration tests
mvn verify
```

## Dependencies

- **Spring Boot 3.5.7** - Framework
- **Spring WebFlux** - Reactive web client for microservice communication
- **Spring Security** - Authentication and authorization
- **Jackson** - JSON processing
- **Lombok** - Boilerplate code reduction
- **AWS SDK** - Cognito, Secrets Manager integration

## Error Handling

The service handles errors gracefully:

### Authentication Errors

- Missing/invalid token → `401 Unauthorized`
- Invalid role → `403 Forbidden`

### Query Errors

- Permission denied → Helpful message with suggestions
- Unknown query → Guided response with examples
- Service unavailable → Error message with retry suggestion

### OpenAI Errors

- API failure → Fallback to keyword-based parsing
- Rate limit → Retry with exponential backoff
- Timeout → Error message after 10 seconds

## Logging

The service logs:

- User queries (sanitized)
- Intent classification results
- Query routing decisions
- Microservice API calls
- OpenAI API usage
- Authorization checks

Log levels:

- `INFO` - Normal operations, query flow
- `WARN` - Fallback scenarios, missing data
- `ERROR` - API failures, exceptions

## Performance

- **Average query time:** < 2 seconds
- **OpenAI timeout:** 30 seconds
- **Microservice timeout:** 10 seconds
- **Concurrent queries:** Handled by Spring WebFlux

## Troubleshooting

### Common Issues

#### "I cannot query..."

- Check user role and permissions
- Verify query scope (personal vs broad)
- See role-specific examples above

#### "Encountered an error while searching..."

- Check microservice availability
- Verify authentication token
- Check network connectivity

#### "AI parsed query as 'unknown'..."

- Query may be too vague
- Try using examples from documentation
- Check for typos

## Contributing

When adding new query types:

1. Add intent parsing rules to `NaturalLanguageQueryService`
2. Create handler method (e.g., `handleXQuery`)
3. Implement name filtering if applicable (search by firstName, lastName, fullName)
4. Use OpenAI for natural language response generation (maintain consistency)
5. Update role-specific features in `getRoleSpecificFeatures()`
6. Update `guide.txt` with examples
7. Add test cases

## License

Part of the Banking Buddy CRM System. Internal use only.

## Support

For issues or questions:

- Check the AI Help Guide in the application
- Review query examples in this README
- Contact the development team
