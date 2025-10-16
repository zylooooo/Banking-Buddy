# Banking Buddy - User Service

A Spring Boot microservice for user management with AWS Cognito integration, providing role-based access control and user lifecycle management.

## 🚀 Features

### Core Functionality

- **Create User**: Create new users with role assignment
- **Get All Users**: Retrieve user lists with role-based filtering
- **Get User by ID**: Fetch individual user details
- **Update User**: Modify user information and roles
- **Enable/Disable User**: Manage user account status
- **Reset Password**: Trigger password reset via email
- **Verify Email**: Mark user email as verified

### Security Features

- **JWT Authentication**: AWS ALB validates Cognito JWT tokens
- **Role-Based Authorization**: Three-tier role system (ROOT_ADMIN, ADMIN, AGENT)
- **Request Validation**: Input validation and sanitization
- **Audit Logging**: Comprehensive logging for security events

## 🏗️ Architecture

### Technology Stack

- **Framework**: Spring Boot 3.5.6
- **Java Version**: 21
- **Database**: MySQL 8.0 with Flyway migrations
- **Authentication**: AWS Cognito + JWT
- **Containerization**: Docker with multi-stage builds
- **Security**: Spring Security with OAuth2 Resource Server

### Role Hierarchy

```text
ROOT_ADMIN (rootAdministrator)
├── Can manage all users and roles
├── Can update any user except other ROOT_ADMINs
└── Full system access

ADMIN (admin)
├── Can create and manage AGENTs
├── Can update own profile and AGENT profiles
└── Cannot manage other ADMINs or ROOT_ADMINs

AGENT (agent)
├── Can only update own profile
├── Cannot create or manage other users
└── Limited system access
```

## 📋 Prerequisites

### Required Software

- **Java 21+**
- **Maven 3.6+**
- **Docker & Docker Compose**
- **AWS CLI** (configured with appropriate credentials)
- **Terraform** (for infrastructure provisioning)

### AWS Resources

- **Cognito User Pool** (provisioned via Terraform)
- **SES** (for email notifications)
- **Secrets Manager** (for database credentials)

## 🛠️ Setup & Installation

### 1. Infrastructure Setup

First, provision the required AWS infrastructure:

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -var-file="environments/dev.tfvars"

# Apply the infrastructure
terraform apply -var-file="environments/dev.tfvars"
```

**Important**: Note down the output values:

- `cognito_user_pool_id`
- `cognito_client_id`
- `ses_sender_email`

### 2. Environment Configuration

Create environment file for the user service:

```bash
# Create environment file
cp .env.user-service.example .env.user-service
```

Follow the template and input the corresponding environment variables.

### 3. SES Email Verification (Required for Email Features)

Configure AWS SES for email notifications:

```bash
# Verify sender email
aws ses verify-email-identity --email-address your-sender@email.com --region ap-southeast-1

# Verify recipient emails (for testing)
aws ses verify-email-identity --email-address test@example.com --region ap-southeast-1

# Check verification status
aws ses get-identity-verification-attributes \
  --identities your-sender@email.com test@example.com \
  --region ap-southeast-1
```

### 4. Database Setup

The service uses Flyway for database migrations. The database will be automatically created and migrated when the service starts.

**Manual Database Reset** (if needed):

```bash
# Stop the service
docker-compose stop user-service

# Reset database
docker exec banking-buddy-mysql mysql -uroot -pBankingBuddy2025 -e "DROP DATABASE IF EXISTS crm_users;"

# Restart service (migrations will run automatically)
docker-compose up -d user-service
```

### 5. Start the Service

```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps
docker logs banking-buddy-user-service
```

## 🧪 Testing the Service

### 1. Create Test Users

#### Option A: Using AWS CLI (Recommended for Development)

```bash
# Create a test user in Cognito
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true Name=given_name,Value=Test Name=family_name,Value=User Name=custom:role,Value=admin \
  --temporary-password TempPass123! \
  --message-action SUPPRESS \
  --region ap-southeast-1

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com \
  --password TestPass123! \
  --permanent \
  --region ap-southeast-1

# Confirm user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com \
  --region ap-southeast-1
```

### 2. Generate JWT Token

Get the powershell script from the dev team. Convert it to a script suitable for your OS. When frontend is implemented and integrated, we can do away the script and get the JWT token from cognito hosted UI instead.

### 3. Test API Endpoints

Use Postman for the API endpoint testing. Create the requests as shown below.

**Base URL**: `http://localhost:8080/api/users`

**Required Headers**:

```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

#### Create User

```http
POST /api/users
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "email": "newuser@example.com",
  "firstName": "New",
  "lastName": "User",
  "role": "agent"
}
```

#### Get All Users

```http
GET /api/users
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get User by ID

```http
GET /api/users/{userId}
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update User

```http
PATCH /api/users/{userId}
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name",
  "role": "admin"
}
```

#### Disable User

```http
PATCH /api/users/{userId}/disable
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Enable User

```http
PATCH /api/users/{userId}/enable
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔧 Development

### Running Locally

```bash
# Build the application
mvn clean package -DskipTests

# Run with Maven
mvn spring-boot:run

# Or run the JAR
java -jar target/user-service-0.0.1-SNAPSHOT.jar
```

### Database Migrations

The service uses Flyway for database migrations. Migrations are located in `src/main/resources/db/migration/`.

**Adding a new migration**:

1. Create a new file: `V{version}__{description}.sql`
2. Place it in `src/main/resources/db/migration/`
3. Restart the service

### Testing

```bash
# Run unit tests
mvn test

# Run integration tests
mvn verify

# Run with coverage
mvn jacoco:report
```

## 📊 Monitoring & Health Checks

### Health Endpoints

- **Health Check**: `GET /actuator/health`
- **Info**: `GET /actuator/info`
- **Metrics**: `GET /actuator/metrics`

### Logging

- **Application Logs**: `docker logs banking-buddy-user-service`
- **Database Logs**: `docker logs banking-buddy-mysql`

### Common Issues

**Service Unhealthy**:

```bash
# Check if curl is available (use wget instead)
docker exec banking-buddy-user-service wget --spider http://localhost:8080/actuator/health
```

**Database Connection Issues**:

```bash
# Check MySQL status
docker exec banking-buddy-mysql mysqladmin ping -h localhost -u root -pBankingBuddy2025
```

**Cognito Authentication Issues**:

- Verify JWT token is valid and not expired
- Check Cognito User Pool configuration
- Ensure user is confirmed and enabled

## 🚀 Deployment

### Docker Build

```bash
# Build the image
docker build -t banking-buddy-user-service .

# Run the container
docker run -p 8080:8080 --env-file .env.user-service banking-buddy-user-service
```

### Production Considerations

- Update CORS origins in `SecurityConfig.java`
- Restrict actuator endpoints in production
- Use AWS Secrets Manager for sensitive configuration
- Enable database encryption
- Configure proper logging levels

## 📚 API Documentation

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2025-10-15T17:30:45.123Z"
}
```

### Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2025-10-15T17:30:45.123Z"
}
```

### Status Codes

- `200 OK`: Successful operation
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add appropriate tests for new functionality
3. Update documentation for API changes
4. Ensure all security validations are in place

## 📄 License

This project is part of the Banking Buddy system for CS301 coursework.

---

**For questions or issues, please refer to the project documentation or contact the development team.**
