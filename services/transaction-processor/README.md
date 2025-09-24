# Transaction Processor Service

## Overview

The Transaction Processor is an AWS Lambda function that handles the ingestion and processing of bank transaction data from an external SFTP server.
This service is part of the Scrooge Global Bank CRM system and implements **Feature 4: Bank Account Transactions Management**.

### Purpose

- **Data Ingestion**: Retrieves transaction files from external SFTP server (mainframe bank application simulation)
- **Data Validation**: Applies business rules and validates transaction data
- **Data Processing**: Parses CSV files and transforms data for consumption by other backend services
- **Data Persistence**: Stores validated and processed transaction data in the transactions database

## Local Development

### Prerequisites

- Python 3.9+
- Docker and Docker Compose
- MySQL (for local database testing)

### Setup

1. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**

   ```bash
   cp .env.transaction-processor.example .env.transaction-processor
   ```

   Refer to the `.env.transaction-processor.example` for a guide to how to configure the environment variables.

```text
Scrooge CRM/
├── sftp-server/                          # External System (Mainframe Simulation)
│   ├── data/
│   │   ├── mock_transactions.py
│   │   └── transactions.csv
│   ├── Dockerfile
│   └── docker-compose.standalone.yml    # SFTP-only testing
│
├── docker-compose.yml                   # Root: Complete local environment
├── .gitignore
├── README.md
│
├── services/                            # Internal CRM Microservices
│   └── transaction-processor/           # AWS Lambda Service
│       ├── src/
│       │   ├── __init__.py
│       │   ├── lambda_handler.py       # Main Lambda entry point
│       │   ├── sftp_client.py          # SFTP operations
│       │   ├── database_client.py      # Database operations
│       │   ├── transaction_validator.py # Data validation
│       │   └── config.py               # Configuration management
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── test_lambda_handler.py
│       │   ├── test_sftp_client.py
│       │   └── test_database_client.py
│       ├── config/
│       │   ├── local.py
│       │   └── production.py
│       ├── .env                        # Local development
│       ├── .env.example               # Template
│       ├── requirements.txt
│       ├── Dockerfile                 # For local testing
│       └── README.md                  # Service documentation
│
├── infrastructure/                     # Infrastructure as Code
│   ├── terraform/                     # Or CloudFormation/CDK
│   │   ├── lambda.tf
│   │   ├── rds.tf
│   │   └── sftp.tf
│   └── aws-sam/                       # Alternative: AWS SAM
│       └── template.yaml
│
├── docs/                              # Documentation
│   ├── architecture.md
│   ├── deployment.md
│   └── api.md
│
└── .github/                           # CI/CD Pipelines
    └── workflows/
        ├── transaction-processor-ci.yml
        ├── security-scan.yml
        └── deploy-staging.yml
```
